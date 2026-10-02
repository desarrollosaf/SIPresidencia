import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DispararPadDto } from './dto/disparar-pad.dto';
import { P6Gateway } from './p6.gateway';

@Controller('p6')
@UseGuards(JwtAuthGuard)
export class P6Controller {
  constructor(private readonly p6Gateway: P6Gateway) {}

  @Get('estado')
  estado() {
    return this.p6Gateway.estado();
  }

  @Post('pad')
  async dispararPad(@Body() dto: DispararPadDto) {
    const respuestas = await this.p6Gateway.enviar('p6:pad', {
      bank: dto.bank,
      pad: dto.pad,
      velocity: dto.velocity ?? 100,
    });
    return { ok: true, puentes: respuestas.length, respuestas };
  }
}
