import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type BancoP6 = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';

export interface EstadoP6 {
  conectado: boolean;
  puentes: number;
}

// El backend reenvía la orden por Socket.IO al puente (Raspberry Pi) que tiene el P-6 por USB.
@Injectable({ providedIn: 'root' })
export class P6Service {
  constructor(private readonly http: HttpClient) {}

  estado(): Observable<EstadoP6> {
    return this.http.get<EstadoP6>(`${environment.apiUrl}/p6/estado`);
  }

  dispararPad(bank: BancoP6, pad: number, velocity = 100): Observable<{ ok: boolean; puentes: number }> {
    return this.http.post<{ ok: boolean; puentes: number }>(`${environment.apiUrl}/p6/pad`, {
      bank,
      pad,
      velocity,
    });
  }
}
