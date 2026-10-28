import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.token;

  const solicitud = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(solicitud).pipe(
    catchError((error: unknown) => {
      const esLogin = req.url === `${environment.apiUrl}/auth/login`;
      // La tableta no usa sesión: un 401 ahí (llave inválida) no debe mandar al login.
      const esTableta = req.url.startsWith(`${environment.apiUrl}/tableta/`);

      if (error instanceof HttpErrorResponse && error.status === 401 && !esLogin && !esTableta) {
        authService.logout();
        void router.navigate(['/login'], { queryParams: { motivo: 'sesion' } });
      }

      return throwError(() => error);
    }),
  );
};
