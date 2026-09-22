import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AgendaService, ResumenAgenda } from '../../core/services/agenda.service';
import { ToastService } from '../../core/services/toast.service';

interface Modulo {
  nombre: string;
  descripcion: string;
  icono: string;
  color: 'acc1' | 'acc2' | 'acc3' | 'acc4';
  ruta?: string;
  proximamente?: boolean;
}

const MODULOS: Modulo[] = [
  {
    nombre: 'Sesiones',
    descripcion: 'Orden del día, video de cada punto y votos.',
    icono: 'sesiones',
    color: 'acc1',
    ruta: '/sesiones',
  },
  {
    nombre: 'Presupuesto',
    descripcion: 'Próximamente.',
    icono: 'presupuesto',
    color: 'acc2',
    proximamente: true,
  },
];

type Segmento = 'hoy' | 'semana' | 'todos';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
})
export class Home implements OnInit, OnDestroy {
  protected readonly modulos = MODULOS;
  protected readonly ahora = signal(new Date());
  private temporizador?: ReturnType<typeof setInterval>;

  protected readonly diasSemana = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
  protected readonly resumen = signal<ResumenAgenda | null>(null);
  protected readonly cargandoAgenda = signal(true);
  protected readonly segmento = signal<Segmento>('hoy');
  protected readonly busqueda = signal('');
  protected readonly mesVisible = signal(this.iniciarMes(new Date()));
  protected readonly diaSeleccionado = signal<string | null>(null);

  protected readonly eventosFiltrados = computed(() => {
    const resumen = this.resumen();
    if (!resumen) return [];

    const hoyIso = this.aIso(new Date());
    const limiteSemana = this.aIso(this.sumarDias(new Date(), 7));
    const todos = [...resumen.eventosHoy, ...resumen.proximosEventos];
    const diaElegido = this.diaSeleccionado();

    const porFecha = todos.filter((evento) => {
      if (diaElegido) return evento.fecha === diaElegido;
      if (this.segmento() === 'hoy') return evento.fecha === hoyIso;
      if (this.segmento() === 'semana') return evento.fecha <= limiteSemana;
      return true;
    });

    const texto = this.busqueda().trim().toLowerCase();
    if (!texto) return porFecha;
    return porFecha.filter(
      (evento) =>
        evento.titulo.toLowerCase().includes(texto) ||
        evento.ubicacion.toLowerCase().includes(texto),
    );
  });

  constructor(
    protected readonly authService: AuthService,
    private readonly agendaService: AgendaService,
    private readonly toastService: ToastService,
  ) {}

  ngOnInit(): void {
    this.temporizador = setInterval(() => this.ahora.set(new Date()), 1000);
    this.agendaService.resumen().subscribe({
      next: (resumen) => {
        this.resumen.set(resumen);
        this.cargandoAgenda.set(false);
      },
      error: () => {
        this.cargandoAgenda.set(false);
        this.toastService.error('No se pudo cargar la agenda del Congreso.');
      },
    });
  }

  ngOnDestroy(): void {
    clearInterval(this.temporizador);
  }

  protected saludo(): string {
    const hora = this.ahora().getHours();
    if (hora < 12) return 'Buenos días';
    if (hora < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }

  protected hora(): string {
    return new Intl.DateTimeFormat('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(this.ahora());
  }

  protected fecha(): string {
    const texto = new Intl.DateTimeFormat('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(this.ahora());
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  protected fechaCorta(fechaIso: string): string {
    const fecha = this.aFechaLocal(fechaIso);
    if (!fecha) return '';
    return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' })
      .format(fecha)
      .replace('.', '');
  }

  protected actualizarBusqueda(evento: Event): void {
    this.busqueda.set((evento.target as HTMLInputElement).value);
  }

  protected elegirSegmento(segmento: Segmento): void {
    this.diaSeleccionado.set(null);
    this.segmento.set(segmento);
  }

  protected elegirDia(fecha: Date): void {
    this.diaSeleccionado.set(this.aIso(fecha));
  }

  protected limpiarDiaSeleccionado(): void {
    this.diaSeleccionado.set(null);
  }

  protected tituloLista(): string {
    if (this.diaSeleccionado()) return `Eventos del ${this.fechaCorta(this.diaSeleccionado()!)}`;
    if (this.segmento() === 'hoy') return 'Eventos de hoy';
    if (this.segmento() === 'semana') return 'Eventos de esta semana';
    return 'Todos los eventos';
  }

  protected etiquetaMes(): string {
    const texto = new Intl.DateTimeFormat('es-MX', { month: 'short', year: 'numeric' })
      .format(this.mesVisible())
      .replace('.', '');
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  protected diasDelMes(): (Date | null)[] {
    const m = this.mesVisible();
    const primerDia = new Date(m.getFullYear(), m.getMonth(), 1);
    const offset = (primerDia.getDay() + 6) % 7; // semana inicia en lunes
    const totalDias = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    const celdas: (Date | null)[] = [];
    for (let i = 0; i < offset; i++) celdas.push(null);
    for (let d = 1; d <= totalDias; d++) celdas.push(new Date(m.getFullYear(), m.getMonth(), d));
    return celdas;
  }

  protected mesAnterior(): void {
    const m = this.mesVisible();
    this.mesVisible.set(new Date(m.getFullYear(), m.getMonth() - 1, 1));
  }

  protected mesSiguiente(): void {
    const m = this.mesVisible();
    this.mesVisible.set(new Date(m.getFullYear(), m.getMonth() + 1, 1));
  }

  protected esHoy(fecha: Date): boolean {
    return this.aIso(fecha) === this.aIso(new Date());
  }

  protected esSeleccionado(fecha: Date): boolean {
    return this.diaSeleccionado() === this.aIso(fecha);
  }

  protected tieneEvento(fecha: Date): boolean {
    return (this.resumen()?.diasConEventos ?? []).includes(this.aIso(fecha));
  }

  private iniciarMes(fecha: Date): Date {
    return new Date(fecha.getFullYear(), fecha.getMonth(), 1);
  }

  private sumarDias(base: Date, dias: number): Date {
    const copia = new Date(base);
    copia.setDate(copia.getDate() + dias);
    return copia;
  }

  private aIso(fecha: Date): string {
    const y = fecha.getFullYear();
    const m = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const d = fecha.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // new Date('yyyy-mm-dd') se interpreta como UTC y se corre un día en zonas horarias negativas.
  // Devuelve null si la fecha viene vacía o mal formada (dato real de la API), en vez de reventar el render.
  private aFechaLocal(fechaIso: string | null | undefined): Date | null {
    const match = fechaIso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(fechaIso) : null;
    if (!match) return null;
    const fecha = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }
}
