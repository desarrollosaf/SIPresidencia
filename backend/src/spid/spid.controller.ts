import { Controller, Get, HttpException, HttpStatus, Logger, Post, Req, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { P6Gateway } from '../p6/p6.gateway';
import { SpidAuthGuard, UsuarioSpid } from './spid-auth.guard';

type ReqSpid = Request & { spid: UsuarioSpid };

// API para la app SPID (perfil de Presidencia).
@Controller('spid/p6')
@UseGuards(SpidAuthGuard)
export class SpidController {
  private readonly logger = new Logger('SpidP6');
  private readonly ultimoAviso = new Map<string, number>();

  constructor(
    private readonly p6: P6Gateway,
    private readonly config: ConfigService,
  ) {}

  /** Solo consulta si el puente del P-6 está en línea; no toca ningún sonido. */
  @Get('estado')
  async estado() {
    const { conectado, puentes } = await this.p6.estado();
    return { conectado, puentes };
  }

  /** Toca el aviso sonoro. El pad lo fija el servidor (SPID_P6_BANK / SPID_P6_PAD). */
  @Post('notificar')
  async notificar(@Req() req: ReqSpid) {
    const usuario = req.spid.usuario;
    const espera = (this.config.get<number>('spid.esperaSegundos') ?? 10) * 1000;
    const ahora = Date.now();
    const anterior = this.ultimoAviso.get(usuario) ?? 0;
    if (ahora - anterior < espera) {
      const faltan = Math.ceil((espera - (ahora - anterior)) / 1000);
      throw new HttpException(
        { statusCode: HttpStatus.TOO_MANY_REQUESTS, message: `Espera ${faltan} s para volver a enviar el aviso.` },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    this.ultimoAviso.set(usuario, ahora);

    const bank = this.config.get<string>('spid.bank');
    const pad = this.config.get<number>('spid.pad');
    try {
      const respuestas = await this.p6.enviar('p6:pad', { bank, pad, velocity: 100 });
      this.logger.log(`Aviso enviado por ${usuario} desde la app (${req.ip}) → ${bank}${pad}`);
      return { ok: true, puentes: respuestas.length };
    } catch (e) {
      this.logger.warn(`Aviso de ${usuario} falló: ${(e as Error).message}`);
      this.ultimoAviso.delete(usuario);
      throw e;
    }
  }
}
