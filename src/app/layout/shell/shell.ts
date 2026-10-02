import { Component, computed, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { P6Service } from '../../core/services/p6.service';
import { ToastService } from '../../core/services/toast.service';
import { ToastContainer } from '../../shared/toast/toast-container';
import { environment } from '../../../environments/environment';

interface NavItem {
  label: string;
  route: string;
  icono: 'inicio' | 'sesiones' | 'salones';
}

const NAV: NavItem[] = [
  { label: 'Inicio', route: '/home', icono: 'inicio' },
  { label: 'Sesiones', route: '/sesiones', icono: 'sesiones' },
  { label: 'Salones', route: '/salones', icono: 'salones' },
];

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ToastContainer],
  templateUrl: './shell.html',
})
export class Shell {
  protected readonly nav = NAV;
  protected readonly user;
  protected readonly iniciales;
  protected readonly sidebarAbierto = signal(false);
  protected readonly enviandoSonido = signal(false);

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly p6Service: P6Service,
    private readonly toastService: ToastService,
  ) {
    this.user = this.authService.currentUser;
    this.iniciales = computed(() => {
      const nombre = this.user()?.nombre ?? '';
      return (
        nombre
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((parte) => parte[0]?.toUpperCase())
          .join('') || '?'
      );
    });
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/login');
  }

  protected tocarSonido(): void {
    if (this.enviandoSonido()) return;
    this.enviandoSonido.set(true);
    const { bank, pad } = environment.p6Pad;

    this.p6Service.dispararPad(bank, pad).subscribe({
      next: () => {
        this.enviandoSonido.set(false);
        this.toastService.success(`Sonido enviado al P-6 (pad ${bank}${pad}).`);
      },
      error: (error: unknown) => {
        this.enviandoSonido.set(false);
        const detalle = error instanceof HttpErrorResponse ? error.error?.message : null;
        this.toastService.error(detalle || 'No se pudo enviar el sonido al P-6.');
      },
    });
  }

  protected alternarSidebar(): void {
    this.sidebarAbierto.set(!this.sidebarAbierto());
  }

  protected cerrarSidebar(): void {
    this.sidebarAbierto.set(false);
  }
}
