import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/jwt-payload';
import { AvisosService } from './avisos.service';
import { ActualizarContactoDto, CrearContactoDto } from './dto/contacto.dto';
import { EnviarAvisoDto } from './dto/enviar-aviso.dto';

// Avisar al equipo por Pushover (vista "Notificar"). Cualquier usuario con sesión puede
// avisar y también dar de alta, editar o quitar personas.
@Controller('avisos')
@UseGuards(JwtAuthGuard)
export class AvisosController {
  constructor(private readonly avisos: AvisosService) {}

  @Get('contactos')
  listar() {
    return this.avisos.listar();
  }

  @Post('contactos')
  crear(@Body() dto: CrearContactoDto) {
    return this.avisos.crear(dto);
  }

  @Patch('contactos/:id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarContactoDto,
  ) {
    return this.avisos.actualizar(id, dto);
  }

  @Delete('contactos/:id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.avisos.eliminar(id);
  }

  @Get('estado')
  estado() {
    return this.avisos.estado();
  }

  @Post('enviar')
  enviar(@Body() dto: EnviarAvisoDto, @Req() req: Request) {
    const usuario = req['user'] as JwtPayload;
    return this.avisos.enviar(dto.contactos, dto.mensaje, usuario.sub);
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
