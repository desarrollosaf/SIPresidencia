# Puente Roland P-6

```
Botón 🔊 (Angular) ──HTTP + JWT──▶ POST /api/p6/pad (NestJS)
                                     │ Socket.IO "p6:pad" (+ ack)
                                     ▼
                         p6_bridge.py (Raspberry Pi / Docker)
                                     │ MIDI USB
                                     ▼
                                 Roland P-6
```

La Raspberry **se conecta hacia el backend** (no al revés), así que no necesitas
conocer su IP: solo la del equipo donde corre el backend. El backend solo acepta
puentes que manden `P6_TOKEN` igual a `P6_BRIDGE_TOKEN` de `backend/.env`.

Pads: banco A–H, pad 1–6 → notas 48–95, canal MIDI 11. El pad que toca el botón
se cambia en `src/environments/environment*.ts` (`p6Pad`).

## 1. Configurar el token

```powershell
# backend/.env
P6_BRIDGE_TOKEN=una-clave-larga

# p6-bridge/p6.env  (copia de p6.env.example)
P6_TOKEN=una-clave-larga
```

Reinicia el backend después de cambiar su `.env`.

## 2. Ejercicio en Docker (Windows)

Docker Desktop en Windows **no puede ver el P-6 por USB** (no hay `/dev/snd`
dentro del contenedor). Sirve para probar toda la cadena con `P6_DRY_RUN=1`:
el contenedor escribe en el log la nota que tocaría.

```powershell
# p6.env: P6_SERVER_URL=http://backend:3050 y P6_DRY_RUN=1
docker compose --profile p6 up -d --build p6-bridge
docker logs -f sipresidencia-p6-bridge        # ver lo que recibe
docker exec -it sipresidencia-p6-bridge bash  # entrar a la bash
```

Dentro de la bash:

```bash
python -c "import mido; print(mido.get_output_names())"
aconnect -l
```

Presiona el botón 🔊 en SIPresidencia y en el log aparece `[DRY-RUN] note_on ...`.

## 3. Que suene de verdad desde la PC (sin Docker)

Con el P-6 conectado por USB a Windows, corre el puente con Python nativo
(usa Python 3.12; cierra otras apps que tengan abierto el MIDI del P-6, como la
pestaña de `puente.html`):

```powershell
cd p6-bridge
py -3.12 -m venv venv
.\venv\Scripts\pip install -r requirements.txt
$env:P6_SERVER_URL="http://localhost:3065"; $env:P6_TOKEN="una-clave-larga"; .\venv\Scripts\python p6_bridge.py
```

(`3065` es el puerto del backend publicado por `docker-compose.yml`; si corres
el backend con `npm`, usa `3050`.)

## 4. Raspberry Pi

`P6_SERVER_URL=http://<IP-de-la-PC-del-backend>:3065` (en producción, el puerto
`3044` de `docker-compose.prod.yml`). Abre ese puerto en el firewall de Windows.

**Con Docker** (aquí sí pasa el USB):

```bash
docker build -t p6-bridge .
docker run -d --name p6-bridge --restart unless-stopped \
  --device /dev/snd --env-file p6.env p6-bridge
docker exec -it p6-bridge bash
```

**Sin Docker (systemd):**

```bash
sudo apt install -y python3-venv libasound2-dev alsa-utils
sudo mkdir -p /opt/p6-bridge && sudo cp p6_bridge.py requirements.txt p6.env /opt/p6-bridge/
sudo chown -R pi:pi /opt/p6-bridge && cd /opt/p6-bridge
python3 -m venv venv && ./venv/bin/pip install -r requirements.txt
sudo cp p6-bridge.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now p6-bridge
journalctl -u p6-bridge -f
```

## Endpoints

| Método | Ruta              | Cuerpo                                   |
| ------ | ----------------- | ---------------------------------------- |
| GET    | `/api/p6/estado`  | —                                        |
| POST   | `/api/p6/pad`     | `{ "bank": "A", "pad": 1, "velocity": 100 }` |

Errores: `503` puente desconectado, `504` el puente no respondió, `502` el
puente respondió pero no pudo tocar el P-6 (el mensaje dice por qué).
