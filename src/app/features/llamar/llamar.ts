import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AvisosBase, mensajeDeError } from '../../shared/avisos/avisos-base';
import { ToastContainer } from '../../shared/toast/toast-container';

// Se recuerda en el navegador para que el acceso directo siga funcionando aunque se abra sin "?llave=".
const LLAVE_KEY = 'sip_tableta_llave';

// Vista "Llamar": solo las tarjetas del equipo, grandes para tocarlas en la tableta.
// En /tableta/<equipo> se muestra a pantalla completa, sin menú ni barra superior (modo kiosco),
// sin sesión y solo con la gente de ese equipo; las alertas las firma su encargado.
// Si el backend define TABLETA_LLAVE, hace falta ?llave=…. Las personas se administran en
// "Equipo de trabajo".
@Component({
  selector: 'app-llamar',
  imports: [RouterLink, ToastContainer],
  templateUrl: './llamar.html',
})
export class Llamar extends AvisosBase {
  private readonly route = inject(ActivatedRoute);
  protected readonly conSesion = inject(AuthService).isAuthenticated;

  protected readonly kiosco = this.route.snapshot.data['kiosco'] === true;
  // Slug de la tableta (/tableta/<slug>); solo en modo kiosco.
  protected readonly slug = this.kiosco ? this.route.snapshot.paramMap.get('equipo') : null;
  // Por qué no se puede usar la tableta: la llave falta / ya no sirve, o el equipo no existe.
  protected readonly sinAcceso = signal<'llave' | 'equipo' | null>(null);

  protected readonly equipoActual = computed(() =>
    this.equipos().find((e) => e.slug === this.slug),
  );

  protected readonly pantallaCompletaDisponible =
    typeof document !== 'undefined' && !!document.documentElement.requestFullscreen;

  protected readonly saludo = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  })();

  constructor() {
    super();
    this.avisosService.usarTableta(this.kiosco, this.kiosco ? this.leerLlave() : null, this.slug);
  }

  /** Para "Modo tableta": la del equipo de la pestaña elegida, o la del Presidente. */
  protected slugTableta(): string {
    const filtro = this.filtroEquipo();
    return this.equipos().find((e) => e.id === filtro)?.slug ?? 'presidente';
  }

  protected alternarPantallaCompleta(): void {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(() => {});
  }

  protected override cargarContactos(): void {
    this.avisosService.contactos().subscribe({
      next: (contactos) => {
        this.contactos.set(contactos);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        if (this.kiosco && e instanceof HttpErrorResponse && [401, 404].includes(e.status)) {
          this.sinAcceso.set(e.status === 401 ? 'llave' : 'equipo');
          return;
        }
        this.toastService.error(mensajeDeError(e, 'No se pudo cargar el equipo.'));
      },
    });
  }

  private leerLlave(): string | null {
    const enEnlace = this.route.snapshot.queryParamMap.get('llave');
    try {
      if (enEnlace) localStorage.setItem(LLAVE_KEY, enEnlace);
      return enEnlace ?? localStorage.getItem(LLAVE_KEY);
    } catch {
      return enEnlace;
    }
  }
}
