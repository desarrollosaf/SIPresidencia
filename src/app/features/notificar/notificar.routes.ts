import { Routes } from '@angular/router';

export const NOTIFICAR_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./notificar').then((m) => m.Notificar),
  },
];
