import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AvisosBase } from '../../shared/avisos/avisos-base';
import { ToastContainer } from '../../shared/toast/toast-container';

// Vista "Llamar": solo las tarjetas del equipo, grandes para tocarlas en la tableta.
// En /tableta se muestra a pantalla completa, sin menú ni barra superior (modo kiosco).
// La administración de personas vive en "Equipo de trabajo".
@Component({
  selector: 'app-llamar',
  imports: [RouterLink, ToastContainer],
  templateUrl: './llamar.html',
})
export class Llamar extends AvisosBase {
  protected readonly kiosco = inject(ActivatedRoute).snapshot.data['kiosco'] === true;
  protected readonly pantallaCompletaDisponible =
    typeof document !== 'undefined' && !!document.documentElement.requestFullscreen;

  protected readonly saludo = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  })();

  protected alternarPantallaCompleta(): void {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(() => {});
  }
}
