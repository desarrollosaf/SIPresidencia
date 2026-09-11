import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
})
export class Login {
  protected email = '';
  protected password = '';
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  enviar(): void {
    if (!this.email || !this.password) return;

    this.cargando.set(true);
    this.error.set(null);
    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        this.cargando.set(false);
        void this.router.navigateByUrl('/home');
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        const mensaje =
          err instanceof HttpErrorResponse && typeof err.error?.message === 'string'
            ? err.error.message
            : 'Correo o contraseña incorrectos.';
        this.error.set(mensaje);
      },
    });
  }
}
