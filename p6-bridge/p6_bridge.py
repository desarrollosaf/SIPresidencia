#!/usr/bin/env python3
"""
Puente Roland P-6: se conecta por Socket.IO al backend de SIPresidencia y
convierte los eventos que recibe en mensajes MIDI hacia el P-6 (USB).

Cada handler regresa un dict que viaja como "ack" al backend; así el botón
de la web sabe si el P-6 sonó o por qué falló.
"""
import asyncio
import logging
import os
from typing import Optional

import mido
import socketio

SERVER_URL = os.getenv("P6_SERVER_URL", "http://192.168.1.100:3050")
SOCKET_PATH = os.getenv("P6_SOCKET_PATH", "socket.io")
TOKEN = os.getenv("P6_TOKEN", "")
DEVICE_MATCH = os.getenv("P6_DEVICE_MATCH", "P-6")
DEFAULT_CHANNEL = int(os.getenv("P6_MIDI_CHANNEL", "11"))  # Roland usa 1..16; mido usa 0..15.
RECONNECT_SECONDS = float(os.getenv("P6_RECONNECT_SECONDS", "5"))
# Sin P-6 conectado (p. ej. Docker en Windows) solo registra los mensajes en el log.
DRY_RUN = os.getenv("P6_DRY_RUN", "0").lower() in ("1", "true", "yes", "si")

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(message)s",
)
log = logging.getLogger("p6-bridge")

sio = socketio.AsyncClient(reconnection=True, logger=False, engineio_logger=False)
midi_out: Optional[mido.ports.BaseOutput] = None


class DryRunOutput:
    name = "dry-run"

    def send(self, msg):
        log.info("[DRY-RUN] %s", msg)


def list_midi_outputs():
    try:
        return mido.get_output_names()
    except Exception as exc:  # sin ALSA/dispositivos rtmidi puede lanzar
        log.warning("No pude listar puertos MIDI: %s", exc)
        return []


def open_p6():
    global midi_out
    names = list_midi_outputs()
    log.info("MIDI outputs encontrados: %s", names)

    match = next((name for name in names if DEVICE_MATCH.lower() in name.lower()), None)
    if match:
        midi_out = mido.open_output(match)
        log.info("Roland P-6 abierto en: %s", match)
        return
    if DRY_RUN:
        midi_out = DryRunOutput()
        log.warning("P6_DRY_RUN activo: no hay '%s', solo se registrarán los mensajes.", DEVICE_MATCH)
        return
    raise RuntimeError(
        f"No encontré un puerto MIDI que contenga '{DEVICE_MATCH}'. "
        f"Puertos disponibles: {names}"
    )


def midi_send(msg: mido.Message):
    """Envía y, si el P-6 se desconectó, cierra el puerto para reabrirlo en el siguiente intento."""
    global midi_out
    if midi_out is None:
        open_p6()
    try:
        midi_out.send(msg)
    except Exception:
        try:
            midi_out.close()
        except Exception:
            pass
        midi_out = None
        raise


def send_note(note: int, velocity: int = 100, channel: int = DEFAULT_CHANNEL, duration_ms: int = 80):
    """
    Roland P-6:
      - pads: notas MIDI 48..95
      - canal sampler predeterminado: 11 según implementación MIDI
    """
    note = max(0, min(127, int(note)))
    velocity = max(1, min(127, int(velocity)))
    ch = max(1, min(16, int(channel))) - 1

    midi_send(mido.Message("note_on", note=note, velocity=velocity, channel=ch))
    log.info("NOTE ON note=%s velocity=%s channel=%s", note, velocity, channel)

    # P-6 no requiere note-off para disparar pads, pero lo enviamos por compatibilidad.
    def note_off():
        try:
            midi_send(mido.Message("note_off", note=note, velocity=0, channel=ch))
        except Exception as exc:
            log.warning("No se pudo enviar note_off: %s", exc)

    asyncio.get_running_loop().call_later(max(0.01, duration_ms / 1000.0), note_off)


def send_cc(control: int, value: int, channel: int = DEFAULT_CHANNEL):
    control = max(0, min(127, int(control)))
    value = max(0, min(127, int(value)))
    ch = max(1, min(16, int(channel))) - 1
    midi_send(mido.Message("control_change", control=control, value=value, channel=ch))
    log.info("CC control=%s value=%s channel=%s", control, value, channel)


def send_program(program: int, channel: int = 16):
    program = max(0, min(63, int(program)))
    ch = max(1, min(16, int(channel))) - 1
    midi_send(mido.Message("program_change", program=program, channel=ch))
    log.info("PROGRAM program=%s channel=%s", program, channel)


@sio.event
async def connect():
    log.info("Conectado al backend: %s", SERVER_URL)
    await sio.emit("p6:status", {
        "online": True,
        "midi_outputs": list_midi_outputs(),
        "device_match": DEVICE_MATCH,
        "dry_run": DRY_RUN,
    })


@sio.event
async def connect_error(data):
    log.warning("El backend rechazó la conexión: %s", data)


@sio.event
async def disconnect():
    log.warning("Socket desconectado del backend (¿P6_TOKEN correcto?)")


@sio.on("p6:note")
async def on_note(data):
    try:
        data = data or {}
        send_note(
            note=data.get("note", 48),
            velocity=data.get("velocity", 100),
            channel=data.get("channel", DEFAULT_CHANNEL),
            duration_ms=data.get("durationMs", 80),
        )
        return {"ok": True, "type": "note", "data": data}
    except Exception as exc:
        log.exception("Error enviando note")
        return {"ok": False, "error": str(exc), "type": "note"}


@sio.on("p6:pad")
async def on_pad(data):
    """
    bank: A..H
    pad: 1..6
    Mapeo:
      A1=48 ... A6=53
      B1=54 ... H6=95
    """
    try:
        data = data or {}
        bank = str(data.get("bank", "A")).upper()
        pad = int(data.get("pad", 1))
        if bank not in "ABCDEFGH" or len(bank) != 1 or not 1 <= pad <= 6:
            raise ValueError("bank debe ser A-H y pad debe ser 1-6")

        note = 48 + ("ABCDEFGH".index(bank) * 6) + (pad - 1)
        send_note(
            note=note,
            velocity=data.get("velocity", 100),
            channel=data.get("channel", DEFAULT_CHANNEL),
            duration_ms=data.get("durationMs", 80),
        )
        return {"ok": True, "type": "pad", "bank": bank, "pad": pad, "note": note, "dry_run": DRY_RUN}
    except Exception as exc:
        log.exception("Error enviando pad")
        return {"ok": False, "error": str(exc), "type": "pad"}


@sio.on("p6:cc")
async def on_cc(data):
    try:
        data = data or {}
        send_cc(data["control"], data["value"], data.get("channel", DEFAULT_CHANNEL))
        return {"ok": True, "type": "cc", "data": data}
    except Exception as exc:
        log.exception("Error enviando CC")
        return {"ok": False, "error": str(exc), "type": "cc"}


@sio.on("p6:program")
async def on_program(data):
    try:
        data = data or {}
        send_program(data.get("program", 0), data.get("channel", 16))
        return {"ok": True, "type": "program", "data": data}
    except Exception as exc:
        log.exception("Error enviando program")
        return {"ok": False, "error": str(exc), "type": "program"}


async def main():
    if not TOKEN:
        log.warning("P6_TOKEN vacío: el backend rechazará la conexión.")

    try:
        open_p6()
    except Exception as exc:
        log.warning("P-6 aún no disponible (se reintenta al recibir un evento): %s", exc)

    while True:
        try:
            log.info("Conectando a %s ...", SERVER_URL)
            await sio.connect(
                SERVER_URL,
                socketio_path=SOCKET_PATH,
                transports=["websocket", "polling"],
                auth={"token": TOKEN},
            )
            await sio.wait()
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            log.warning("Conexión falló: %s. Reintento en %.1fs", exc, RECONNECT_SECONDS)
            await asyncio.sleep(RECONNECT_SECONDS)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
