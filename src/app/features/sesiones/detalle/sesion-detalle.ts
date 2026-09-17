import { Component, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  EventoDetalle,
  Punto,
  SesionesService,
  VotosPunto,
} from '../../../core/services/sesiones.service';
import { ToastService } from '../../../core/services/toast.service';

type FiltroPuntos = 'todos' | 'video' | 'sin-video';

@Component({
  selector: 'app-sesion-detalle',
  imports: [DatePipe, RouterLink],
  templateUrl: './sesion-detalle.html',
})
export class SesionDetalle implements OnInit {
  protected readonly evento = signal<EventoDetalle | null>(null);
  protected readonly cargando = signal(true);
  protected readonly filtro = signal<FiltroPuntos>('todos');

  protected readonly puntoAbierto = signal<number | null>(null);
  protected readonly votosAbierto = signal<number | null>(null);
  protected readonly votosPorPunto = signal<Record<number, VotosPunto>>({});
  protected readonly cargandoVotos = signal<number | null>(null);
  protected readonly detalleVotosAbierto = signal<number | null>(null);
  protected readonly duracionPorPunto = signal<Record<number, number>>({});

  constructor(
    private readonly route: ActivatedRoute,
    private readonly sesionesService: SesionesService,
    private readonly toastService: ToastService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.sesionesService.detalleEvento(id).subscribe({
      next: (evento) => {
        this.evento.set(evento);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toastService.error('No se pudo cargar el evento.');
      },
    });
  }

  protected puntosFiltrados(puntos: Punto[]): Punto[] {
    switch (this.filtro()) {
      case 'video':
        return puntos.filter((p) => !!p.video_url);
      case 'sin-video':
        return puntos.filter((p) => !p.video_url);
      default:
        return puntos;
    }
  }

  protected contarConVideo(puntos: Punto[]): number {
    return puntos.filter((p) => !!p.video_url).length;
  }

  protected contarSinVideo(puntos: Punto[]): number {
    return puntos.length - this.contarConVideo(puntos);
  }

  protected esAbierto(punto: Punto): boolean {
    return this.puntoAbierto() === punto.id || this.votosAbierto() === punto.id;
  }

  protected alternarMedia(punto: Punto): void {
    this.puntoAbierto.set(this.puntoAbierto() === punto.id ? null : punto.id);
  }

  protected alternarVotos(punto: Punto): void {
    if (this.votosAbierto() === punto.id) {
      this.votosAbierto.set(null);
      return;
    }
    this.votosAbierto.set(punto.id);
    if (this.votosPorPunto()[punto.id]) return;

    this.cargandoVotos.set(punto.id);
    this.sesionesService.votosPunto(punto.id).subscribe({
      next: (votos) => {
        this.votosPorPunto.update((mapa) => ({ ...mapa, [punto.id]: votos }));
        this.cargandoVotos.set(null);
      },
      error: () => {
        this.cargandoVotos.set(null);
        this.toastService.error('No se pudieron cargar los votos de este punto.');
      },
    });
  }

  protected onDuracion(punto: Punto, evento: Event): void {
    const video = evento.target as HTMLVideoElement;
    if (!isFinite(video.duration)) return;
    this.duracionPorPunto.update((mapa) => ({ ...mapa, [punto.id]: video.duration }));
  }

  protected formatoDuracion(segundos: number): string {
    const total = Math.round(segundos);
    const min = Math.floor(total / 60);
    const seg = total % 60;
    return `${min}:${seg.toString().padStart(2, '0')} min`;
  }

  // Mismo criterio 0-3 que usa el resto de SIRegistroParlamentario para
  // asistencia; para votos no está confirmado 1:1, revisar si no calza.
  protected etiquetaVoto(sentido: unknown): string {
    const etiquetas: Record<number, string> = {
      0: 'Pendiente',
      1: 'A favor',
      2: 'En contra',
      3: 'Abstención',
    };
    return etiquetas[Number(sentido)] ?? String(sentido);
  }

  protected nombreIntegrante(integrante: unknown): string {
    const obj = integrante as { diputado?: string };
    return obj?.diputado ?? '—';
  }

  protected sentidoIntegrante(integrante: unknown): unknown {
    return (integrante as { sentido?: unknown })?.sentido;
  }

  protected alternarDetalleVotos(puntoId: number): void {
    this.detalleVotosAbierto.set(this.detalleVotosAbierto() === puntoId ? null : puntoId);
  }

  protected conteoVotos(votos: VotosPunto): {
    favor: number;
    contra: number;
    abstencion: number;
    pendiente: number;
  } {
    const conteo = { favor: 0, contra: 0, abstencion: 0, pendiente: 0 };
    for (const integrante of votos.integrantes) {
      switch (Number(this.sentidoIntegrante(integrante))) {
        case 1:
          conteo.favor++;
          break;
        case 2:
          conteo.contra++;
          break;
        case 3:
          conteo.abstencion++;
          break;
        default:
          conteo.pendiente++;
      }
    }
    return conteo;
  }
}
