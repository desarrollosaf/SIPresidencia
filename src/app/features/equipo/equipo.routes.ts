import { Routes } from '@angular/router';

export const EQUIPO_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./equipo').then((m) => m.EquipoTrabajo),
  },
];
