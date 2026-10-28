import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('./features/login/login.routes').then((m) => m.LOGIN_ROUTES),
  },
  // "Llamar" a pantalla completa para la tableta de cada equipo (sin menú ni barra superior):
  // /tableta/presidente, /tableta/omar… No pide sesión (si el backend define TABLETA_LLAVE,
  // hace falta ?llave=…). /tableta a secas es la dirección anterior: lleva a la del Presidente.
  { path: 'tableta', pathMatch: 'full', redirectTo: 'tableta/presidente' },
  {
    path: 'tableta/:equipo',
    data: { kiosco: true },
    loadComponent: () => import('./features/llamar/llamar').then((m) => m.Llamar),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      {
        path: 'home',
        loadChildren: () => import('./features/home/home.routes').then((m) => m.HOME_ROUTES),
      },
      {
        path: 'sesiones',
        loadChildren: () =>
          import('./features/sesiones/sesiones.routes').then((m) => m.SESIONES_ROUTES),
      },
      {
        path: 'salones',
        loadChildren: () =>
          import('./features/salones/salones.routes').then((m) => m.SALONES_ROUTES),
      },
      {
        path: 'llamar',
        loadChildren: () => import('./features/llamar/llamar.routes').then((m) => m.LLAMAR_ROUTES),
      },
      {
        path: 'equipo',
        loadChildren: () => import('./features/equipo/equipo.routes').then((m) => m.EQUIPO_ROUTES),
      },
      // Dirección anterior de la vista; quien la tenga guardada llega a "Llamar".
      { path: 'notificar', redirectTo: 'llamar' },
    ],
  },
  { path: '**', redirectTo: '' },
];
