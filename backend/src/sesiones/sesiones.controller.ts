import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SesionesService } from './sesiones.service';

@Controller('sesiones')
@UseGuards(JwtAuthGuard)
export class SesionesController {
  constructor(private readonly sesionesService: SesionesService) {}

  @Get('eventos')
  ultimosEventos() {
    return this.sesionesService.ultimosEventos();
  }

  @Get('eventos/fecha/:fecha')
  eventosPorFecha(@Param('fecha') fecha: string) {
    return this.sesionesService.eventosPorFecha(fecha);
  }

  @Get('eventos/:id')
  detalleEvento(@Param('id') id: string) {
    return this.sesionesService.detalleEvento(id);
  }

  @Post('puntos/:idPunto/votos')
  votosPunto(@Param('idPunto') idPunto: string) {
    return this.sesionesService.votosPunto(idPunto);
  }
}
