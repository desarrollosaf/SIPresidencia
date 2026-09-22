import { Routes } from '@angular/router';

export const SALONES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./salones').then((m) => m.Salones),
  },
];
