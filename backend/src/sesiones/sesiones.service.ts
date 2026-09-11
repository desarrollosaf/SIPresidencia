import { Injectable } from '@nestjs/common';
import { RegistroParlamentarioService } from '../registro-parlamentario/registro-parlamentario.service';

@Injectable()
export class SesionesService {
  constructor(private readonly registroService: RegistroParlamentarioService) {}

  async ultimosEventos() {
    return this.registroService.ultimosEventos('1');
  }

  async eventosPorFecha(fecha: string) {
    return this.registroService.eventosPorFecha(fecha);
  }

  async detalleEvento(id: string) {
    const [agenda, respuestaPuntos] = await Promise.all([
      this.registroService.agenda(id),
      this.registroService.puntos(id),
    ]);
    // getpuntos no regresa un arreglo plano: viene como { message, data, selectini }.
    const puntos = (respuestaPuntos as { data?: unknown })?.data ?? [];
    return { ...(agenda as object), puntos };
  }

  async votosPunto(idPunto: string) {
    return this.registroService.votosPunto(idPunto);
  }
}
