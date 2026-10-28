import { Directive, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AvisosService,
  ContactoAviso,
  ResultadoAviso,
  UltimoAviso,
} from '../../core/services/avisos.service';
import { ToastService } from '../../core/services/toast.service';

// Colores de los avatares; rotan por persona.
const TONOS = ['primary', 'acc1', 'acc2', 'acc3', 'acc4', 'brass'] as const;

export const MENSAJES_RAPIDOS = [
  'Ven a mi oficina',
  'Te necesito urgente',
  'Llámame',
  'Pasa a la sala de juntas',
];

// Mientras alguna alerta siga sonando se consulta el estado para mostrar cuándo la vieron.
const CONSULTA_MS = 5000;

export function mensajeDeError(e: unknown, defecto: string): string {
  if (e instanceof HttpErrorResponse) {
    const m = (e.error as { message?: string | string[] } | null)?.message;
    if (Array.isArray(m)) return m.join('. ');
    if (m) return m;
  }
  return defecto;
}

// Lo que comparten las vistas "Llamar" y "Equipo de trabajo": la lista de personas,
// enviar / detener avisos y el estado en vivo de cada alerta.
@Directive()
export abstract class AvisosBase implements OnInit, OnDestroy {
  protected readonly avisosService = inject(AvisosService);
  protected readonly toastService = inject(ToastService);

  protected readonly mensajesRapidos = MENSAJES_RAPIDOS;

  protected readonly cargando = signal(true);
  protected readonly contactos = signal<ContactoAviso[]>([]);
  protected readonly estados = signal<Record<number, UltimoAviso>>({});
  protected readonly mensaje = signal('');
  protected readonly enviando = signal<Set<number>>(new Set());
  protected readonly ahora = signal(Date.now());

  protected readonly activos = computed(() => this.contactos().filter((c) => c.activo));

  protected readonly totales = computed(() => {
    const estados = Object.values(this.estados());
    return {
      equipo: this.activos().length,
      sonando: estados.filter((e) => e.estado === 'sonando').length,
      vistos: estados.filter((e) => e.estado === 'visto').length,
    };
  });

  private temporizador?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.cargarContactos();
    this.consultarEstado();
    this.temporizador = setInterval(() => {
      this.ahora.set(Date.now());
      if (this.totales().sonando > 0) this.consultarEstado();
    }, CONSULTA_MS);
  }

  ngOnDestroy(): void {
    clearInterval(this.temporizador);
  }

  // ---------- Avisar ----------

  protected notificar(contacto: ContactoAviso): void {
    this.enviar([contacto.id]);
  }

  protected notificarTodos(): void {
    const ids = this.activos().map((c) => c.id);
    if (ids.length) this.enviar(ids);
  }

  protected detener(contacto?: ContactoAviso): void {
    this.avisosService.cancelar(contacto?.id).subscribe({
      next: ({ canceladas }) => {
        this.toastService.info(
          contacto
            ? `Se detuvo la alerta de ${contacto.nombre}.`
            : `Se detuvieron ${canceladas} alerta${canceladas === 1 ? '' : 's'}.`,
        );
        this.consultarEstado();
      },
      error: (e) => this.toastService.error(mensajeDeError(e, 'No se pudo detener la alerta.')),
    });
  }

  protected usarMensajeRapido(texto: string): void {
    this.mensaje.set(this.mensaje() === texto ? '' : texto);
  }

  protected actualizarMensaje(evento: Event): void {
    this.mensaje.set((evento.target as HTMLInputElement).value);
  }

  // ---------- Presentación ----------

  protected iniciales(nombre: string): string {
    return (
      nombre
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join('') || '?'
    );
  }

  protected tono(index: number): string {
    return TONOS[index % TONOS.length];
  }

  protected estadoDe(contacto: ContactoAviso): UltimoAviso | undefined {
    return this.estados()[contacto.id];
  }

  protected estaEnviando(contacto: ContactoAviso): boolean {
    return this.enviando().has(contacto.id);
  }

  protected hace(ms: number): string {
    const minutos = Math.floor((this.ahora() - ms) / 60000);
    if (minutos < 1) return 'hace un momento';
    if (minutos < 60) return `hace ${minutos} min`;
    return `a las ${this.hora(ms)}`;
  }

  protected hora(ms: number): string {
    return new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(ms);
  }

  // ---------- Internos ----------

  protected cargarContactos(): void {
    this.avisosService.contactos().subscribe({
      next: (contactos) => {
        this.contactos.set(contactos);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.toastService.error(mensajeDeError(e, 'No se pudo cargar el equipo.'));
      },
    });
  }

  protected consultarEstado(): void {
    this.avisosService.estado().subscribe({
      next: (estados) => this.estados.set(estados),
      error: () => {},
    });
  }

  private enviar(ids: number[]): void {
    this.enviando.update((s) => new Set([...s, ...ids]));
    const quitar = () =>
      this.enviando.update((s) => new Set([...s].filter((id) => !ids.includes(id))));

    this.avisosService.enviar(ids, this.mensaje()).subscribe({
      next: (resultados) => {
        quitar();
        this.avisarResultado(resultados);
        this.consultarEstado();
      },
      error: (e) => {
        quitar();
        this.toastService.error(mensajeDeError(e, 'No se pudo enviar el aviso.'));
      },
    });
  }

  private avisarResultado(resultados: ResultadoAviso[]): void {
    const ok = resultados.filter((r) => r.ok).map((r) => r.nombre);
    const fallaron = resultados.filter((r) => !r.ok);
    if (ok.length) {
      this.toastService.success(
        ok.length === 1
          ? `A ${ok[0]} ya le está sonando el teléfono.`
          : `Avisado: ${ok.join(', ')}.`,
      );
    }
    for (const r of fallaron)
      this.toastService.error(`No se pudo avisar a ${r.nombre}: ${r.error}`);
  }
}
