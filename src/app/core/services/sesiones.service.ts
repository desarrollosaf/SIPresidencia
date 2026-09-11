import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface EventoResumen {
  id: string;
  descripcion: string | null;
  fecha: string;
  liga: string | null;
  tipoevento: string | null;
  integrantes: unknown[];
}

export interface Punto {
  id: number;
  nopunto: number | null;
  punto: string;
  observaciones: string | null;
  video_url: string | null;
  video_actualizado_en: string | null;
  [clave: string]: unknown;
}

export interface EventoDetalle {
  id: string;
  fecha: string | null;
  hora: string | null;
  descripcion: string | null;
  orden_dia: string | null;
  puntos: Punto[];
  [clave: string]: unknown;
}

export interface VotosPunto {
  msg: string;
  evento: unknown;
  integrantes: unknown[];
  tipovento: number;
}

@Injectable({ providedIn: 'root' })
export class SesionesService {
  constructor(private readonly http: HttpClient) {}

  ultimosEventos(): Observable<{ ok: boolean; data: EventoResumen[] }> {
    return this.http.get<{ ok: boolean; data: EventoResumen[] }>(
      `${environment.apiUrl}/sesiones/eventos`,
    );
  }

  eventosPorFecha(fecha: string): Observable<unknown> {
    return this.http.get(`${environment.apiUrl}/sesiones/eventos/fecha/${fecha}`);
  }

  detalleEvento(id: string): Observable<EventoDetalle> {
    return this.http.get<EventoDetalle>(`${environment.apiUrl}/sesiones/eventos/${id}`);
  }

  votosPunto(idPunto: number): Observable<VotosPunto> {
    return this.http.post<VotosPunto>(`${environment.apiUrl}/sesiones/puntos/${idPunto}/votos`, {});
  }
}
