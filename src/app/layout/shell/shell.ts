import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { AvisosService } from '../../core/services/avisos.service';
import { ToastContainer } from '../../shared/toast/toast-container';

// Cada cuánto revisa la campana si hay alertas del equipo sonando.
const CONSULTA_ALERTAS_MS = 15000;

interface NavItem {
  label: string;
  route: string;
  icono: 'inicio' | 'sesiones' | 'salones' | 'llamar' | 'equipo';
}

const NAV: NavItem[] = [
  { label: 'Inicio', route: '/home', icono: 'inicio' },
  { label: 'Sesiones', route: '/sesiones', icono: 'sesiones' },
  { label: 'Salones', route: '/salones', icono: 'salones' },
  { label: 'Llamar', route: '/llamar', icono: 'llamar' },
  { label: 'Equipo de trabajo', route: '/equipo', icono: 'equipo' },
];

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ToastContainer],
  templateUrl: './shell.html',
})
export class Shell implements OnInit, OnDestroy {
  protected readonly nav = NAV;
  protected readonly user;
  protected readonly iniciales;
  protected readonly sidebarAbierto = signal(false);
  protected readonly alertasSonando = signal(0);

  private readonly url;
  // Nombre de la sección actual para la barra superior (ej. "Salones").
  protected readonly seccion;

  private temporizador?: ReturnType<typeof setInterval>;

  constructor(
    private readonly authService: AuthService,
    private readonly avisosService: AvisosService,
    private readonly router: Router,
  ) {
    this.url = toSignal(
      this.router.events.pipe(
        filter((e) => e instanceof NavigationEnd),
        map((e) => e.urlAfterRedirects),
      ),
      { initialValue: this.router.url },
    );
    this.seccion = computed(
      () => NAV.find((item) => this.url().startsWith(item.route))?.label ?? '',
    );
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

  ngOnInit(): void {
    this.revisarAlertas();
    this.temporizador = setInterval(() => this.revisarAlertas(), CONSULTA_ALERTAS_MS);
  }

  ngOnDestroy(): void {
    clearInterval(this.temporizador);
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

  private revisarAlertas(): void {
    this.avisosService.estado().subscribe({
      next: (estados) =>
        this.alertasSonando.set(
          Object.values(estados).filter((e) => e.estado === 'sonando').length,
        ),
      error: () => {},
    });
  }
}
