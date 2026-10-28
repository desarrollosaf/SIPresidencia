import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ContactoAviso {
  id: number;
  nombre: string;
  puesto: string | null;
  pushoverUser: string;
  pushoverDevice: string | null;
  sonido: string | null;
  activo: boolean;
}

export type ContactoForm = Pick<ContactoAviso, 'nombre' | 'pushoverUser'> & {
  puesto?: string;
  pushoverDevice?: string;
  sonido?: string;
  activo?: boolean;
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

// El backend manda las alertas por Pushover: suenan aunque el iPhone esté en silencio
// y se repiten hasta que la persona las confirma.
@Injectable({ providedIn: 'root' })
export class AvisosService {
  private readonly url = `${environment.apiUrl}/avisos`;

  constructor(private readonly http: HttpClient) {}

  contactos(): Observable<ContactoAviso[]> {
    return this.http.get<ContactoAviso[]>(`${this.url}/contactos`);
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
    return this.http.get<Record<number, UltimoAviso>>(`${this.url}/estado`);
  }

  enviar(contactos: number[], mensaje: string): Observable<ResultadoAviso[]> {
    return this.http.post<ResultadoAviso[]>(`${this.url}/enviar`, { contactos, mensaje });
  }

  cancelar(id?: number): Observable<{ ok: boolean; canceladas: number }> {
    return this.http.post<{ ok: boolean; canceladas: number }>(
      id ? `${this.url}/cancelar/${id}` : `${this.url}/cancelar`,
      {},
    );
  }
}
