import { Routes } from '@angular/router';

export const LLAMAR_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./llamar').then((m) => m.Llamar),
  },
];
