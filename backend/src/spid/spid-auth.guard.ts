import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import type { Request } from 'express';

export interface UsuarioSpid {
  usuario: string;
}

// Valida el token de la app SPID preguntándole a SPID quién es (GET /api/user/me) y sus
// comisiones (GET /api/diputado/mis-comisiones). Solo pasa quien preside la Junta de
// Coordinación Política. SIPresidencia no necesita la llave con la que SPID firma sus tokens.
@Injectable()
export class SpidAuthGuard implements CanActivate {
  private readonly logger = new Logger('SpidAuth');
  // Caché corta de tokens ya validados para no consultar SPID en cada petición.
  private readonly cache = new Map<string, { usuario: string; presidente: boolean; vence: number }>();

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const auth = req.headers.authorization;
    const token = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    if (!token) throw new UnauthorizedException('Falta el token de SPID.');

    const { usuario, presidente } = await this.validar(token);
    if (!presidente) {
      this.logger.warn(`Acceso denegado a ${usuario} (${req.ip})`);
      throw new ForbiddenException('Solo la Presidencia puede usar esta función.');
    }

    (req as Request & { spid?: UsuarioSpid }).spid = { usuario };
    return true;
  }

  private async validar(token: string): Promise<{ usuario: string; presidente: boolean }> {
    const ahora = Date.now();
    const enCache = this.cache.get(token);
    if (enCache && enCache.vence > ahora) return enCache;

    const base = this.config.get<string>('spid.apiUrl');
    const opciones = {
      headers: { Authorization: `Bearer ${token}` },
      timeout: this.config.get<number>('spid.timeoutMs'),
    };
    let usuario: string;
    let comisiones: { nombre?: string; cargo?: string }[];
    try {
      const [yo, mias] = await Promise.all([
        firstValueFrom(this.http.get<{ rfc?: string }>(`${base}/api/user/me`, opciones)),
        firstValueFrom(this.http.get<{ comisiones?: { nombre?: string; cargo?: string }[] }>(`${base}/api/diputado/mis-comisiones`, opciones)),
      ]);
      usuario = String(yo.data?.rfc ?? '').trim().toLowerCase();
      comisiones = mias.data?.comisiones ?? [];
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 403) throw new UnauthorizedException('Sesión de SPID inválida o expirada.');
      throw new ServiceUnavailableException('No se pudo validar la sesión con SPID.');
    }
    if (!usuario) throw new UnauthorizedException('Sesión de SPID inválida.');

    const resultado = { usuario, presidente: comisiones.some(esPresidenciaJucopo) };
    this.cache.set(token, { ...resultado, vence: ahora + 60_000 });
    if (this.cache.size > 500) this.cache.clear();
    return resultado;
  }
}

const normalizar = (t: string) =>
  t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Preside la JUCOPO. El cargo debe EMPEZAR con "presiden" para no contar "Vicepresidencia". */
function esPresidenciaJucopo(c: { nombre?: string; cargo?: string }): boolean {
  return normalizar(c.nombre ?? '').includes('junta de coordinacion politica')
    && normalizar(c.cargo ?? '').startsWith('presiden');
}
