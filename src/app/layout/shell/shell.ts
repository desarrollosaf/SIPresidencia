import { Component, computed, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastContainer } from '../../shared/toast/toast-container';

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

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
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

  protected alternarSidebar(): void {
    this.sidebarAbierto.set(!this.sidebarAbierto());
  }

  protected cerrarSidebar(): void {
    this.sidebarAbierto.set(false);
  }
}
