import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EventoResumen, SesionesService } from '../../../core/services/sesiones.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-sesiones-lista',
  imports: [RouterLink],
  templateUrl: './sesiones-lista.html',
})
export class SesionesLista implements OnInit {
  protected readonly eventos = signal<EventoResumen[]>([]);
  protected readonly cargando = signal(true);
  protected fecha = '';

  protected readonly diasSemana = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
  protected readonly calendarioAbierto = signal(false);
  protected readonly mesVisible = signal(this.iniciarMes(new Date()));
  protected readonly fechaSeleccionada = signal<Date | null>(null);

  constructor(
    private readonly sesionesService: SesionesService,
    private readonly toastService: ToastService,
  ) {}

  ngOnInit(): void {
    this.cargarUltimos();
  }

  protected cargarUltimos(): void {
    this.fecha = '';
    this.fechaSeleccionada.set(null);
    this.cargando.set(true);
    this.sesionesService.ultimosEventos().subscribe({
      next: (respuesta) => {
        this.eventos.set(respuesta.data ?? []);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toastService.error(
          'No se pudieron cargar los eventos. Revisa que SIRegistroParlamentario esté encendido.',
        );
      },
    });
  }

  protected dia(fechaIso: string): string {
    return new Intl.DateTimeFormat('es-MX', { day: 'numeric' }).format(new Date(fechaIso));
  }

  protected mesCorto(fechaIso: string): string {
    return new Intl.DateTimeFormat('es-MX', { month: 'short' })
      .format(new Date(fechaIso))
      .replace('.', '');
  }

  protected buscarPorFecha(): void {
    if (!this.fecha) return;
    this.cargando.set(true);
    this.sesionesService.eventosPorFecha(this.fecha).subscribe({
      next: (respuesta) => {
        const crudos = (respuesta as { eventos?: RawEventoFecha[] })?.eventos ?? [];
        this.eventos.set(crudos.map(normalizarEventoFecha));
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toastService.error('No se pudo buscar en esa fecha.');
      },
    });
  }

  protected alternarCalendario(): void {
    if (this.calendarioAbierto()) {
      this.cerrarCalendario();
      return;
    }
    this.mesVisible.set(this.iniciarMes(this.fechaSeleccionada() ?? new Date()));
    this.calendarioAbierto.set(true);
  }

  protected cerrarCalendario(): void {
    this.calendarioAbierto.set(false);
  }

  protected mesAnterior(): void {
    const m = this.mesVisible();
    this.mesVisible.set(new Date(m.getFullYear(), m.getMonth() - 1, 1));
  }

  protected mesSiguiente(): void {
    const m = this.mesVisible();
    this.mesVisible.set(new Date(m.getFullYear(), m.getMonth() + 1, 1));
  }

  protected etiquetaMes(): string {
    const texto = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(
      this.mesVisible(),
    );
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

  protected esHoy(fecha: Date): boolean {
    return this.esMismoDia(fecha, new Date());
  }

  protected esSeleccionado(fecha: Date): boolean {
    const sel = this.fechaSeleccionada();
    return !!sel && this.esMismoDia(fecha, sel);
  }

  protected elegirDia(fecha: Date): void {
    this.fechaSeleccionada.set(fecha);
    this.fecha = this.aIso(fecha);
    this.calendarioAbierto.set(false);
  }

  protected irAHoy(): void {
    this.elegirDia(new Date());
  }

  protected etiquetaFechaSeleccionada(): string {
    const sel = this.fechaSeleccionada();
    if (!sel) return 'Elige una fecha';
    return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
      .format(sel)
      .replace('.', '');
  }

  private iniciarMes(fecha: Date): Date {
    return new Date(fecha.getFullYear(), fecha.getMonth(), 1);
  }

  private esMismoDia(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
    );
  }

  private aIso(fecha: Date): string {
    const y = fecha.getFullYear();
    const m = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const d = fecha.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

interface RawEventoFecha {
  id: string;
  descripcion: string | null;
  fecha: string;
  titulo?: string;
  tipoevento?: { nombre?: string } | string | null;
}

function normalizarEventoFecha(ev: RawEventoFecha): EventoResumen {
  return {
    id: ev.id,
    descripcion: ev.descripcion || ev.titulo || null,
    fecha: ev.fecha,
    liga: null,
    tipoevento:
      typeof ev.tipoevento === 'object' ? (ev.tipoevento?.nombre ?? null) : (ev.tipoevento ?? null),
    integrantes: [],
  };
}
