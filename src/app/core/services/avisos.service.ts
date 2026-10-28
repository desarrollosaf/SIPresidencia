import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// Equipo de un encargado (ej. Presidente → Francisco Vázquez). Cada uno tiene su tableta /tableta/<slug>.
export interface EquipoAviso {
  id: number;
  slug: string;
  nombre: string;
  encargado: string;
}

export interface ContactoAviso {
  id: number;
  nombre: string;
  puesto: string | null;
  pushoverUser: string;
  pushoverDevice: string | null;
  sonido: string | null;
  activo: boolean;
  equipoId: number | null;
}

export type ContactoForm = Pick<ContactoAviso, 'nombre' | 'pushoverUser'> & {
  puesto?: string;
  pushoverDevice?: string;
  sonido?: string;
  activo?: boolean;
  equipoId?: number | null;
};

export type EstadoAviso = 'sonando' | 'visto' | 'expirado' | 'cancelado' | 'error';

export interface UltimoAviso {
  estado: EstadoAviso;
  enviadoEn: number;
  enviadoPor: string;
  mensaje: string;
  vistoEn: number | null;
}

export interface ResultadoAviso {
  id: number;
  nombre: string;
  ok: boolean;
  error?: string;
}

// El backend manda las alertas por Pushover: suenan aunque el iPhone esté en silencio,
// dos veces seguidas, sin que haya que confirmarlas.
@Injectable({ providedIn: 'root' })
export class AvisosService {
  private readonly url = `${environment.apiUrl}/avisos`;
  // La tableta sin sesión usa /tableta en vez de /avisos: solo ver, llamar y detener
  // (dar de alta / editar / quitar siempre pide sesión). La llave solo se manda si el enlace la trae.
  private modoTableta = false;
  private llave: string | null = null;
  // Equipo de la tableta (/tableta/<slug>): filtra a su gente y firma las alertas con su encargado.
  private equipo: string | null = null;

  constructor(private readonly http: HttpClient) {}

  usarTableta(activo: boolean, llave: string | null = null, equipo: string | null = null): void {
    this.modoTableta = activo;
    this.llave = activo ? llave : null;
    this.equipo = activo ? equipo : null;
  }

  private get base(): string {
    return this.modoTableta ? `${environment.apiUrl}/tableta` : this.url;
  }

  private get opciones(): { headers?: HttpHeaders } {
    return this.llave ? { headers: new HttpHeaders({ 'X-Llave-Tableta': this.llave }) } : {};
  }

  equipos(): Observable<EquipoAviso[]> {
    return this.http.get<EquipoAviso[]>(`${this.base}/equipos`, this.opciones);
  }

  contactos(): Observable<ContactoAviso[]> {
    return this.http.get<ContactoAviso[]>(`${this.base}/contactos`, {
      ...this.opciones,
      ...(this.equipo && { params: { equipo: this.equipo } }),
    });
  }

  crear(datos: ContactoForm): Observable<{ id: number; dispositivos: string[] }> {
    return this.http.post<{ id: number; dispositivos: string[] }>(`${this.url}/contactos`, datos);
  }

  actualizar(id: number, datos: Partial<ContactoForm>): Observable<{ ok: boolean }> {
    return this.http.patch<{ ok: boolean }>(`${this.url}/contactos/${id}`, datos);
  }

  eliminar(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.url}/contactos/${id}`);
  }

  estado(): Observable<Record<number, UltimoAviso>> {
    return this.http.get<Record<number, UltimoAviso>>(`${this.base}/estado`, this.opciones);
  }

  enviar(contactos: number[], mensaje: string): Observable<ResultadoAviso[]> {
    return this.http.post<ResultadoAviso[]>(
      `${this.base}/enviar`,
      { contactos, mensaje, ...(this.equipo && { equipo: this.equipo }) },
      this.opciones,
    );
  }

  cancelar(id?: number): Observable<{ ok: boolean; canceladas: number }> {
    return this.http.post<{ ok: boolean; canceladas: number }>(
      id ? `${this.base}/cancelar/${id}` : `${this.base}/cancelar`,
      {},
      this.opciones,
    );
  }
}
