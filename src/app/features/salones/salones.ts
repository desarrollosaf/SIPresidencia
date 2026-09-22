import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { AgendaService, EventoAgenda, SalonAgenda } from '../../core/services/agenda.service';
import { ToastService } from '../../core/services/toast.service';

type Segmento = 'hoy' | 'semana' | 'mes';
type EstadoSalon = 'en-evento' | 'proximamente' | 'disponible' | 'sin-eventos';

const RANGO_INICIO = 8; // 08:00
const RANGO_FIN = 20; // 20:00
const RANGO_TOTAL = RANGO_FIN - RANGO_INICIO;

function aIso(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = (fecha.getMonth() + 1).toString().padStart(2, '0');
  const d = fecha.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function sumarDias(base: Date, dias: number): Date {
  const copia = new Date(base);
  copia.setDate(copia.getDate() + dias);
  return copia;
}

function horaActualStr(fecha: Date): string {
  return `${fecha.getHours().toString().padStart(2, '0')}:${fecha.getMinutes().toString().padStart(2, '0')}`;
}

function sumarMinutos(fecha: Date, minutos: number): string {
  const copia = new Date(fecha.getTime() + minutos * 60000);
  return horaActualStr(copia);
}

function horaDecimal(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h + m / 60;
}

@Component({
  selector: 'app-salones',
  templateUrl: './salones.html',
})
export class Salones implements OnInit, OnDestroy {
  protected readonly RANGO_INICIO = RANGO_INICIO;
  protected readonly horasEscala = Array.from({ length: RANGO_TOTAL + 1 }, (_, i) =>
    `${(RANGO_INICIO + i).toString().padStart(2, '0')}:00`,
  );

  protected readonly cargando = signal(true);
  protected readonly salones = signal<SalonAgenda[]>([]);
  protected readonly ahora = signal(new Date());
  protected readonly fecha = signal(aIso(new Date()));
  protected readonly segmento = signal<Segmento>('hoy');
  protected readonly busqueda = signal('');
  protected readonly filtroSalonId = signal<number | 'todos'>('todos');

  private temporizador?: ReturnType<typeof setInterval>;

  protected readonly hoyIso = aIso(new Date());

  protected readonly salonesFiltrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const filtroId = this.filtroSalonId();
    return this.salones().filter((salon) => {
      if (filtroId !== 'todos' && salon.id !== filtroId) return false;
      if (texto && !salon.nombre.toLowerCase().includes(texto)) return false;
      return true;
    });
  });

  protected readonly totales = computed(() => {
    const ahora = this.ahora();
    const estados = this.salones().map((s) => this.estadoDeSalon(s, ahora));
    return {
      monitoreados: this.salones().length,
      enEvento: estados.filter((e) => e === 'en-evento').length,
      proximamente: estados.filter((e) => e === 'proximamente').length,
      disponibles: estados.filter((e) => e === 'disponible' || e === 'sin-eventos').length,
    };
  });

  protected readonly eventosSemanaOMes = computed(() => {
    const dias = this.segmento() === 'semana' ? 7 : 30;
    const limite = aIso(sumarDias(new Date(), dias));
    const salonesVisibles = new Set(this.salonesFiltrados().map((s) => s.id));
    const eventos: (EventoAgenda & { salonNombre: string; salonColor: string })[] = [];
    for (const salon of this.salones()) {
      if (!salonesVisibles.has(salon.id)) continue;
      for (const evento of salon.eventos) {
        if (evento.fecha >= this.hoyIso && evento.fecha <= limite) {
          eventos.push({ ...evento, salonNombre: salon.nombre, salonColor: salon.color });
        }
      }
    }
    return eventos.sort((a, b) =>
      a.fecha === b.fecha ? a.horaInicio.localeCompare(b.horaInicio) : a.fecha.localeCompare(b.fecha),
    );
  });

  constructor(
    private readonly agendaService: AgendaService,
    private readonly toastService: ToastService,
  ) {}

  ngOnInit(): void {
    this.temporizador = setInterval(() => this.ahora.set(new Date()), 60000);
    this.agendaService.salones().subscribe({
      next: (salones) => {
        this.salones.set(salones);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toastService.error('No se pudo cargar la ocupación de los salones.');
      },
    });
  }

  ngOnDestroy(): void {
    clearInterval(this.temporizador);
  }

  protected actualizarBusqueda(evento: Event): void {
    this.busqueda.set((evento.target as HTMLInputElement).value);
  }

  protected actualizarFecha(evento: Event): void {
    this.fecha.set((evento.target as HTMLInputElement).value);
  }

  protected actualizarFiltroSalon(evento: Event): void {
    const valor = (evento.target as HTMLSelectElement).value;
    this.filtroSalonId.set(valor === 'todos' ? 'todos' : Number(valor));
  }

  protected verSemanaCompleta(): void {
    this.segmento.set('semana');
  }

  protected eventosDelDia(salon: SalonAgenda): EventoAgenda[] {
    return salon.eventos.filter((e) => e.fecha === this.fecha());
  }

  protected eventoActual(salon: SalonAgenda): EventoAgenda | null {
    const horaActual = horaActualStr(this.ahora());
    return (
      salon.eventos.find(
        (e) =>
          e.fecha === this.hoyIso &&
          e.horaInicio <= horaActual &&
          (e.horaFin === null || e.horaFin >= horaActual),
      ) ?? null
    );
  }

  protected proximoEvento(salon: SalonAgenda): EventoAgenda | null {
    const horaActual = horaActualStr(this.ahora());
    return (
      salon.eventos.find((e) => e.fecha > this.hoyIso || (e.fecha === this.hoyIso && e.horaInicio > horaActual)) ??
      null
    );
  }

  protected estadoSalon(salon: SalonAgenda): EstadoSalon {
    return this.estadoDeSalon(salon, this.ahora());
  }

  protected etiquetaEstado(estado: EstadoSalon): string {
    switch (estado) {
      case 'en-evento':
        return 'En evento';
      case 'proximamente':
        return 'Próximamente';
      case 'sin-eventos':
        return 'Sin eventos';
      default:
        return 'Disponible';
    }
  }

  protected posicionBarra(evento: EventoAgenda): { left: number; width: number } {
    const inicio = Math.max(RANGO_INICIO, horaDecimal(evento.horaInicio));
    const finRaw = evento.horaFin ? horaDecimal(evento.horaFin) : inicio + 0.5;
    const fin = Math.min(RANGO_FIN, Math.max(finRaw, inicio + 0.25));
    const left = ((inicio - RANGO_INICIO) / RANGO_TOTAL) * 100;
    const width = Math.max(((fin - inicio) / RANGO_TOTAL) * 100, 1.5);
    return { left, width };
  }

  protected posicionAhora(): number | null {
    if (this.fecha() !== this.hoyIso) return null;
    const decimal = horaDecimal(horaActualStr(this.ahora()));
    if (decimal < RANGO_INICIO || decimal > RANGO_FIN) return null;
    return ((decimal - RANGO_INICIO) / RANGO_TOTAL) * 100;
  }

  protected fechaCorta(fechaIso: string): string {
    const [y, m, d] = fechaIso.split('-').map(Number);
    return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' })
      .format(new Date(y, m - 1, d))
      .replace('.', '');
  }

  protected etiquetaFechaFoco(): string {
    const [y, m, d] = this.fecha().split('-').map(Number);
    const texto = new Intl.DateTimeFormat('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date(y, m - 1, d));
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  private estadoDeSalon(salon: SalonAgenda, ahora: Date): EstadoSalon {
    const eventosHoy = salon.eventos.filter((e) => e.fecha === this.hoyIso);
    if (eventosHoy.length === 0) return 'sin-eventos';

    const horaActual = horaActualStr(ahora);
    const enCurso = eventosHoy.some(
      (e) => e.horaInicio <= horaActual && (e.horaFin === null || e.horaFin >= horaActual),
    );
    if (enCurso) return 'en-evento';

    const limiteProximo = sumarMinutos(ahora, 60);
    const proximo = eventosHoy.some((e) => e.horaInicio > horaActual && e.horaInicio <= limiteProximo);
    if (proximo) return 'proximamente';

    return 'disponible';
  }
}
