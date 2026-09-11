import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface Modulo {
  nombre: string;
  descripcion: string;
  icono: string;
  color: 'acc1' | 'acc2' | 'acc3' | 'acc4';
  ruta?: string;
  proximamente?: boolean;
}

const MODULOS: Modulo[] = [
  {
    nombre: 'Sesiones',
    descripcion: 'Orden del día, video de cada punto y votos.',
    icono: 'sesiones',
    color: 'acc1',
    ruta: '/sesiones',
  },
  {
    nombre: 'Presupuesto',
    descripcion: 'Próximamente.',
    icono: 'presupuesto',
    color: 'acc2',
    proximamente: true,
  },
];

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
})
export class Home implements OnInit, OnDestroy {
  protected readonly modulos = MODULOS;
  protected readonly ahora = signal(new Date());
  private temporizador?: ReturnType<typeof setInterval>;

  constructor(protected readonly authService: AuthService) {}

  ngOnInit(): void {
    this.temporizador = setInterval(() => this.ahora.set(new Date()), 1000);
  }

  ngOnDestroy(): void {
    clearInterval(this.temporizador);
  }

  protected saludo(): string {
    const hora = this.ahora().getHours();
    if (hora < 12) return 'Buenos días';
    if (hora < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }

  protected hora(): string {
    return new Intl.DateTimeFormat('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(this.ahora());
  }

  protected fecha(): string {
    const texto = new Intl.DateTimeFormat('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(this.ahora());
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }
}
