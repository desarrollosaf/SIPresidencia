import { Component } from '@angular/core';
import { AvisosBase } from '../../shared/avisos/avisos-base';

// Vista "Llamar": solo las tarjetas del equipo, grandes para tocarlas en la tableta.
// La administración de personas vive en "Equipo de trabajo".
@Component({
  selector: 'app-llamar',
  templateUrl: './llamar.html',
})
export class Llamar extends AvisosBase {}
