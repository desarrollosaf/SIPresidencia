import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EventoResumen, SesionesService } from '../../../core/services/sesiones.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-sesiones-lista',
  imports: [RouterLink, FormsModule],
  templateUrl: './sesiones-lista.html',
})
export class SesionesLista implements OnInit {
  protected readonly eventos = signal<EventoResumen[]>([]);
  protected readonly cargando = signal(true);
  protected fecha = '';

  constructor(
    private readonly sesionesService: SesionesService,
    private readonly toastService: ToastService,
  ) {}

  ngOnInit(): void {
    this.cargarUltimos();
  }

  protected cargarUltimos(): void {
    this.fecha = '';
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
