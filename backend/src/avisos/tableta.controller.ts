import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AvisosService } from './avisos.service';
import { EnviarAvisoDto } from './dto/enviar-aviso.dto';
import { LlaveTabletaGuard } from './llave-tableta.guard';

// Lo mínimo para la vista "Llamar" de la tableta (sin sesión): ver el equipo, llamar y detener.
// No permite dar de alta / editar / quitar ni ve las claves de Pushover. Cada equipo tiene su
// tableta (/tableta/<slug>): ve solo a su gente y sus alertas las firma su encargado.
@Controller('tableta')
@UseGuards(LlaveTabletaGuard)
export class TabletaController {
  constructor(private readonly avisos: AvisosService) {}

  @Get('equipos')
  equipos() {
    return this.avisos.listarEquipos();
  }

  @Get('contactos')
  listar(@Query('equipo') equipo?: string) {
    return this.avisos.listarParaTableta(equipo);
  }

  @Get('estado')
  estado() {
    return this.avisos.estado();
  }

  @Post('enviar')
  async enviar(@Body() dto: EnviarAvisoDto) {
    const remitente = await this.avisos.encargadoDe(dto.equipo);
    return this.avisos.enviar(dto.contactos, dto.mensaje, remitente);
  }

  @Post('cancelar')
  cancelarTodos() {
    return this.avisos.cancelar();
  }

  @Post('cancelar/:id')
  cancelar(@Param('id', ParseIntPipe) id: number) {
    return this.avisos.cancelar(id);
  }
}
