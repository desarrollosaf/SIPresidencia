import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

const resumen = (texto: string) => createHash('sha256').update(texto).digest();

// Deja entrar a la vista "Llamar" de la tableta sin iniciar sesión. Si TABLETA_LLAVE está definida,
// exige la llave del enlace /tableta?llave=… (header X-Llave-Tableta); cambiarla invalida el enlace.
@Injectable()
export class LlaveTabletaGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const esperada = this.config.get<string>('pushover.tabletaLlave');
    // Sin TABLETA_LLAVE la ruta de la tableta queda abierta (decisión del área: solo la conocen
    // pocas personas). Basta con definirla para exigir la llave sin tocar el código.
    if (!esperada) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const recibida = req.headers['x-llave-tableta'];
    // Se comparan los hashes para que el tiempo no dependa del largo ni del contenido.
    if (
      typeof recibida !== 'string' ||
      !timingSafeEqual(resumen(recibida), resumen(esperada))
    ) {
      throw new UnauthorizedException('El enlace de la tableta no es válido.');
    }
    return true;
  }
}
