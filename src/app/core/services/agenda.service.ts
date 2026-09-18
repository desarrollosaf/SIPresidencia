import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

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

function construirResumenEjemplo(): ResumenAgenda {
  const hoy = new Date();

  const eventos: EventoAgenda[] = [
    {
      id: 'demo-1',
      titulo: 'Sesión solemne de apertura',
      descripcion:
        'Inauguración del Segundo Periodo Ordinario de Sesiones del Congreso del Estado de México.',
      fecha: aIso(hoy),
      horaInicio: '10:00',
      horaFin: '12:00',
      ubicacion: 'Salón de Plenos',
      tipo: 'Sesión',
      tipoColor: 'primary',
      destacado: true,
      imagenUrl: null,
    },
    {
      id: 'demo-2',
      titulo: 'Reunión de la Junta de Coordinación Política',
      descripcion: 'Acuerdos sobre la agenda legislativa del periodo.',
      fecha: aIso(hoy),
      horaInicio: '13:00',
      horaFin: '14:00',
      ubicacion: 'Sala de Juntas',
      tipo: 'Comisión',
      tipoColor: 'favor',
      destacado: false,
      imagenUrl: null,
    },
    {
      id: 'demo-3',
      titulo: 'Foro de Participación Ciudadana',
      descripcion: 'Espacio abierto para la ciudadanía sobre temas legislativos.',
      fecha: aIso(hoy),
      horaInicio: '16:00',
      horaFin: '18:00',
      ubicacion: 'Auditorio "José María Morelos"',
      tipo: 'Institucional',
      tipoColor: 'brass',
      destacado: false,
      imagenUrl: null,
    },
    {
      id: 'demo-4',
      titulo: 'Presentación de libro',
      descripcion: 'Presentación editorial en el vestíbulo principal.',
      fecha: aIso(hoy),
      horaInicio: '18:00',
      horaFin: null,
      ubicacion: 'Vestíbulo Principal',
      tipo: 'Cultural',
      tipoColor: 'acc4',
      destacado: false,
      imagenUrl: null,
    },
    {
      id: 'demo-5',
      titulo: 'Foro de innovación legislativa',
      descripcion: 'Encuentro sobre herramientas digitales para el trabajo parlamentario.',
      fecha: aIso(sumarDias(hoy, 6)),
      horaInicio: '11:00',
      horaFin: '13:00',
      ubicacion: 'Auditorio "José María Morelos"',
      tipo: 'Institucional',
      tipoColor: 'brass',
      destacado: false,
      imagenUrl: null,
    },
    {
      id: 'demo-6',
      titulo: 'Sesión ordinaria',
      descripcion: 'Sesión ordinaria del Pleno del Congreso.',
      fecha: aIso(sumarDias(hoy, 11)),
      horaInicio: '10:00',
      horaFin: null,
      ubicacion: 'Salón de Plenos',
      tipo: 'Sesión',
      tipoColor: 'primary',
      destacado: false,
      imagenUrl: null,
    },
    {
      id: 'demo-7',
      titulo: 'Comisión de Presupuesto',
      descripcion: 'Análisis del paquete fiscal para el siguiente ejercicio.',
      fecha: aIso(sumarDias(hoy, 2)),
      horaInicio: '09:30',
      horaFin: '11:30',
      ubicacion: 'Sala de Comisiones 2',
      tipo: 'Comisión',
      tipoColor: 'favor',
      destacado: false,
      imagenUrl: null,
    },
  ];

  const eventosHoy = eventos.filter((e) => e.fecha === aIso(hoy));
  const proximosEventos = eventos
    .filter((e) => e.fecha > aIso(hoy))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  return {
    totales: {
      eventosHoy: eventosHoy.length,
      proximosEventos: proximosEventos.length,
      salonesOcupados: 2,
      salonesDisponibles: 5,
      eventosDestacados: eventos.filter((e) => e.destacado).length,
    },
    eventoDestacado: eventos.find((e) => e.destacado) ?? null,
    eventosHoy,
    proximosEventos,
    diasConEventos: eventos.map((e) => e.fecha),
  };
}

@Injectable({ providedIn: 'root' })
export class AgendaService {
  // Datos de ejemplo hasta conectar el sistema de agenda en producción; misma forma para sustituir por http.get.
  resumen(): Observable<ResumenAgenda> {
    return of(construirResumenEjemplo()).pipe(delay(200));
  }
}
