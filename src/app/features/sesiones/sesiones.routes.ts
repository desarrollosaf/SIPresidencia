import { Routes } from '@angular/router';

export const SESIONES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./lista/sesiones-lista').then((m) => m.SesionesLista),
  },
  {
    path: ':id',
    loadComponent: () => import('./detalle/sesion-detalle').then((m) => m.SesionDetalle),
  },
];
