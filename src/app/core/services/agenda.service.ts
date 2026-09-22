import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface EventoAgenda {
  id: string;
  titulo: string;
  descripcion: string;
  fecha: string; // ISO yyyy-mm-dd
  horaInicio: string; // HH:mm
  horaFin: string | null;
  ubicacion: string;
  tipo: string;
  tipoColor: 'primary' | 'brass' | 'favor' | 'acc4';
  destacado: boolean;
  imagenUrl: string | null;
}

export interface ResumenAgenda {
  totales: {
    eventosHoy: number;
    proximosEventos: number;
    salonesOcupados: number;
    salonesDisponibles: number;
    eventosDestacados: number;
  };
  eventoDestacado: EventoAgenda | null;
  eventosHoy: EventoAgenda[];
  proximosEventos: EventoAgenda[];
  diasConEventos: string[]; // ISO yyyy-mm-dd
}

export interface SalonAgenda {
  id: number;
  nombre: string;
  color: string;
  eventos: EventoAgenda[];
}

interface EventoAgendaApi {
  fecha_termino: string;
  hora_inicio: string;
  hora_termino: string | null;
  sede: string;
  titulo: string;
  descripcion: string | null;
  evento: string | null;
  materia: string | null;
  modalidad: string | null;
  tipo_reunion: string | null;
  folio: string | null;
  referencia: string | null;
}

interface SedeAgendaApi {
  id: number;
  salon: string;
  color: string;
  agenda: { fecha_inicio: string }[];
}

interface AgendaApiResponse {
  success: boolean;
  agenda: Record<string, EventoAgendaApi[]>;
  sedes: SedeAgendaApi[];
}

// El folio identifica trámites internos (p. ej. "18001/3383/2026"); cuando el
// título trae eso en vez de una categoría legible, usamos tipo_reunion.
const FOLIO_PATTERN = /^\d+\/\d+\/\d+$/;

function horaDe(fechaHora: string | null): string | null {
  return fechaHora ? fechaHora.slice(11, 16) : null;
}

function categoriaDe(ev: EventoAgendaApi): string {
  if (ev.titulo && !FOLIO_PATTERN.test(ev.titulo)) return ev.titulo;
  return ev.tipo_reunion ?? 'Evento institucional';
}

function colorDeCategoria(categoria: string): EventoAgenda['tipoColor'] {
  const texto = categoria.toLowerCase();
  if (texto.includes('sesión') || texto.includes('sesion')) return 'primary';
  if (texto.includes('comisión') || texto.includes('comision')) return 'favor';
  if (texto.includes('otro') || texto.includes('privad')) return 'acc4';
  return 'brass';
}

function descripcionSecundaria(ev: EventoAgendaApi, titulo: string): string {
  if (ev.materia && ev.materia !== titulo) return ev.materia;
  if (ev.modalidad) return `Modalidad: ${ev.modalidad}`;
  return '';
}

function mapEvento(fecha: string, ev: EventoAgendaApi, indice: number): EventoAgenda {
  const categoria = categoriaDe(ev);
  const titulo = ev.descripcion || ev.evento || categoria;
  return {
    id: `${fecha}-${indice}`,
    titulo,
    descripcion: descripcionSecundaria(ev, titulo),
    fecha,
    horaInicio: horaDe(ev.hora_inicio) ?? '—',
    horaFin: horaDe(ev.hora_termino),
    ubicacion: ev.sede,
    tipo: categoria,
    tipoColor: colorDeCategoria(categoria),
    destacado: false,
    imagenUrl: null,
  };
}

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

function mapearTodosLosEventos(resp: AgendaApiResponse): EventoAgenda[] {
  const dias = Object.keys(resp.agenda).sort();
  return dias.flatMap((fecha) => resp.agenda[fecha].map((ev, indice) => mapEvento(fecha, ev, indice)));
}

function construirResumen(resp: AgendaApiResponse): ResumenAgenda {
  const hoyIso = aIso(new Date());
  const limiteSemanaIso = aIso(sumarDias(new Date(), 7));

  const dias = Object.keys(resp.agenda).sort();
  const todosLosEventos = mapearTodosLosEventos(resp);

  const eventosHoy = todosLosEventos
    .filter((e) => e.fecha === hoyIso)
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

  const proximosEventos = todosLosEventos
    .filter((e) => e.fecha > hoyIso)
    .sort((a, b) =>
      a.fecha === b.fecha ? a.horaInicio.localeCompare(b.horaInicio) : a.fecha.localeCompare(b.fecha),
    );

  const destacadoHoy = eventosHoy.find((e) => e.tipoColor === 'primary') ?? eventosHoy[0] ?? null;

  const salonesOcupados = resp.sedes.filter((sede) =>
    sede.agenda.some((a) => a.fecha_inicio === hoyIso),
  ).length;

  const eventosDestacadosSemana = todosLosEventos.filter(
    (e) => e.tipoColor === 'primary' && e.fecha >= hoyIso && e.fecha <= limiteSemanaIso,
  ).length;

  return {
    totales: {
      eventosHoy: eventosHoy.length,
      proximosEventos: proximosEventos.filter((e) => e.fecha <= limiteSemanaIso).length,
      salonesOcupados,
      salonesDisponibles: resp.sedes.length,
      eventosDestacados: eventosDestacadosSemana,
    },
    eventoDestacado: destacadoHoy ? { ...destacadoHoy, destacado: true } : null,
    eventosHoy,
    proximosEventos,
    diasConEventos: dias,
  };
}

function construirSalones(resp: AgendaApiResponse): SalonAgenda[] {
  const todosLosEventos = mapearTodosLosEventos(resp);

  return resp.sedes
    .filter((sede) => sede.salon && sede.salon !== 'N/A')
    .map((sede) => ({
      id: sede.id,
      nombre: sede.salon,
      color: sede.color,
      eventos: todosLosEventos
        .filter((e) => e.ubicacion === sede.salon)
        .sort((a, b) =>
          a.fecha === b.fecha ? a.horaInicio.localeCompare(b.horaInicio) : a.fecha.localeCompare(b.fecha),
        ),
    }));
}

@Injectable({ providedIn: 'root' })
export class AgendaService {
  // La misma respuesta trae la agenda por día y por salón; se comparte para no duplicar la petición.
  private readonly datos$: Observable<AgendaApiResponse>;

  constructor(private readonly http: HttpClient) {
    this.datos$ = this.http.get<AgendaApiResponse>(environment.agendaApiUrl).pipe(shareReplay(1));
  }

  resumen(): Observable<ResumenAgenda> {
    return this.datos$.pipe(map((respuesta) => construirResumen(respuesta)));
  }

  salones(): Observable<SalonAgenda[]> {
    return this.datos$.pipe(map((respuesta) => construirSalones(respuesta)));
  }
}
