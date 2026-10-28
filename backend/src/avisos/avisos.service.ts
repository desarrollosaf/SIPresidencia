import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { InjectModel } from '@nestjs/sequelize';
import { firstValueFrom } from 'rxjs';
import { isAxiosError } from 'axios';
import { ContactoAviso } from '../database/models/contacto-aviso.model';
import { Usuario } from '../database/models/usuario.model';
import { ActualizarContactoDto, CrearContactoDto } from './dto/contacto.dto';

// Todas las alertas llevan esta etiqueta para poder cancelarlas de golpe.
const TAG_GENERAL = 'sipresidencia';
// No consultar el mismo recibo más de una vez cada tantos ms (Pushover pide no saturar /receipts).
const CONSULTA_RECIBO_MS = 5000;

export type EstadoAviso =
  'sonando' | 'visto' | 'expirado' | 'cancelado' | 'error';

interface UltimoAviso {
  receipt: string | null;
  estado: EstadoAviso;
  enviadoEn: number;
  enviadoPor: string;
  mensaje: string;
  vistoEn: number | null;
  ultimaConsulta: number;
  error?: string;
}

export interface ResultadoAviso {
  id: number;
  nombre: string;
  ok: boolean;
  error?: string;
}

@Injectable()
export class AvisosService {
  private readonly logger = new Logger('Avisos');
  // Último aviso por contacto. En memoria: si el backend se reinicia solo se pierde el estado en pantalla.
  private readonly ultimos = new Map<number, UltimoAviso>();

  constructor(
    @InjectModel(ContactoAviso)
    private readonly contactos: typeof ContactoAviso,
    @InjectModel(Usuario) private readonly usuarios: typeof Usuario,
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  // ---------- Contactos ----------

  async listar() {
    const filas = await this.contactos.findAll({ order: [['nombre', 'ASC']] });
    return filas.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      puesto: c.puesto,
      pushoverUser: c.pushoverUser,
      pushoverDevice: c.pushoverDevice,
      sonido: c.sonido,
      activo: c.activo,
    }));
  }

  async crear(dto: CrearContactoDto) {
    const dispositivos = await this.validarUsuario(
      dto.pushoverUser,
      dto.pushoverDevice,
    );
    const contacto = await this.contactos.create({
      nombre: dto.nombre.trim(),
      puesto: dto.puesto?.trim() || null,
      pushoverUser: dto.pushoverUser,
      pushoverDevice: dto.pushoverDevice?.trim() || null,
      sonido: dto.sonido || null,
    });
    return { id: contacto.id, dispositivos };
  }

  async actualizar(id: number, dto: ActualizarContactoDto) {
    const contacto = await this.buscar(id);
    const user = dto.pushoverUser ?? contacto.pushoverUser;
    const device =
      dto.pushoverDevice !== undefined
        ? dto.pushoverDevice
        : contacto.pushoverDevice;
    if (dto.pushoverUser !== undefined || dto.pushoverDevice !== undefined) {
      await this.validarUsuario(user, device ?? undefined);
    }
    await contacto.update({
      ...(dto.nombre !== undefined && { nombre: dto.nombre.trim() }),
      ...(dto.puesto !== undefined && { puesto: dto.puesto.trim() || null }),
      ...(dto.pushoverUser !== undefined && { pushoverUser: dto.pushoverUser }),
      ...(dto.pushoverDevice !== undefined && {
        pushoverDevice: dto.pushoverDevice.trim() || null,
      }),
      ...(dto.sonido !== undefined && { sonido: dto.sonido || null }),
      ...(dto.activo !== undefined && { activo: dto.activo }),
    });
    return { ok: true };
  }

  async eliminar(id: number) {
    const contacto = await this.buscar(id);
    await contacto.destroy();
    this.ultimos.delete(id);
    return { ok: true };
  }

  // ---------- Avisos ----------

  async enviar(
    ids: number[],
    mensaje: string | undefined,
    usuarioId: number,
  ): Promise<ResultadoAviso[]> {
    const token = this.token();
    const contactos = await this.contactos.findAll({
      where: { id: ids, activo: true },
    });
    if (!contactos.length)
      throw new NotFoundException('No se encontró a ninguna persona activa.');

    const espera =
      (this.config.get<number>('pushover.esperaSegundos') ?? 30) * 1000;
    const ahora = Date.now();
    const listos = contactos.filter(
      (c) => ahora - (this.ultimos.get(c.id)?.enviadoEn ?? 0) >= espera,
    );
    if (!listos.length) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Ya se avisó hace un momento. Espera unos segundos.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const remitente =
      (await this.usuarios.findByPk(usuarioId))?.nombre ?? 'Presidencia';
    const texto = mensaje?.trim() || 'Te necesitan, por favor acude.';

    return Promise.all(
      listos.map(async (c): Promise<ResultadoAviso> => {
        try {
          const { data } = await this.post<{ receipt: string }>(
            '/messages.json',
            {
              token,
              user: c.pushoverUser,
              device: c.pushoverDevice || undefined,
              title: '🚨 Te buscan de Presidencia',
              message: `${texto}\n— ${remitente}`,
              priority: 2,
              retry: Math.max(
                30,
                this.config.get<number>('pushover.reintentoSegundos') ?? 30,
              ),
              expire: Math.min(
                10800,
                this.config.get<number>('pushover.expiraSegundos') ?? 10800,
              ),
              sound: c.sonido || this.config.get<string>('pushover.sonido'),
              tags: `${TAG_GENERAL},contacto-${c.id}`,
            },
          );
          this.ultimos.set(c.id, {
            receipt: data.receipt,
            estado: 'sonando',
            enviadoEn: Date.now(),
            enviadoPor: remitente,
            mensaje: texto,
            vistoEn: null,
            ultimaConsulta: Date.now(),
          });
          this.logger.log(`Aviso a ${c.nombre} enviado por ${remitente}`);
          return { id: c.id, nombre: c.nombre, ok: true };
        } catch (e) {
          const error = this.mensajeError(e);
          this.logger.warn(`Aviso a ${c.nombre} falló: ${error}`);
          return { id: c.id, nombre: c.nombre, ok: false, error };
        }
      }),
    );
  }

  /** Estado del último aviso de cada contacto (consulta a Pushover si sigue sonando). */
  async estado() {
    const token = this.config.get<string>('pushover.token');
    const ahora = Date.now();
    await Promise.all(
      [...this.ultimos.values()]
        .filter(
          (u) =>
            u.estado === 'sonando' &&
            u.receipt &&
            ahora - u.ultimaConsulta >= CONSULTA_RECIBO_MS,
        )
        .map(async (u) => {
          u.ultimaConsulta = ahora;
          try {
            const { data } = await firstValueFrom(
              this.http.get<{
                acknowledged: number;
                acknowledged_at: number;
                expired: number;
              }>(`${this.apiUrl()}/receipts/${u.receipt}.json`, {
                params: { token },
                timeout: this.timeout(),
              }),
            );
            if (data.acknowledged) {
              u.estado = 'visto';
              u.vistoEn = data.acknowledged_at * 1000;
            } else if (data.expired) {
              u.estado = 'expirado';
            }
          } catch (e) {
            this.logger.warn(
              `No se pudo consultar el recibo ${u.receipt}: ${this.mensajeError(e)}`,
            );
          }
        }),
    );
    return Object.fromEntries(
      [...this.ultimos.entries()].map(([id, u]) => [
        id,
        {
          estado: u.estado,
          enviadoEn: u.enviadoEn,
          enviadoPor: u.enviadoPor,
          mensaje: u.mensaje,
          vistoEn: u.vistoEn,
        },
      ]),
    );
  }

  /** Detiene la alerta de una persona, o todas si no se indica. */
  async cancelar(id?: number) {
    const token = this.token();
    const tag = id ? `contacto-${id}` : TAG_GENERAL;
    const { data } = await this.post<{ canceled?: number }>(
      `/receipts/cancel_by_tag/${tag}.json`,
      { token },
    );
    for (const [contactoId, u] of this.ultimos) {
      if ((!id || contactoId === id) && u.estado === 'sonando')
        u.estado = 'cancelado';
    }
    return { ok: true, canceladas: data.canceled ?? 0 };
  }

  // ---------- Internos ----------

  private async buscar(id: number) {
    const contacto = await this.contactos.findByPk(id);
    if (!contacto) throw new NotFoundException('No existe esa persona.');
    return contacto;
  }

  /** Confirma con Pushover que el User Key existe y tiene un teléfono registrado. */
  private async validarUsuario(
    user: string,
    device?: string,
  ): Promise<string[]> {
    try {
      const { data } = await this.post<{ devices: string[] }>(
        '/users/validate.json',
        {
          token: this.token(),
          user,
          device: device || undefined,
        },
      );
      return data.devices ?? [];
    } catch (e) {
      if (e instanceof HttpException) throw e;
      throw new BadRequestException(
        `Pushover rechazó la clave: ${this.mensajeError(e)}`,
      );
    }
  }

  private async post<T>(ruta: string, cuerpo: Record<string, unknown>) {
    return firstValueFrom(
      this.http.post<T>(`${this.apiUrl()}${ruta}`, cuerpo, {
        timeout: this.timeout(),
      }),
    );
  }

  private token(): string {
    const token = this.config.get<string>('pushover.token');
    if (!token)
      throw new ServiceUnavailableException(
        'Falta configurar PUSHOVER_TOKEN en el servidor.',
      );
    return token;
  }

  private apiUrl() {
    return this.config.get<string>('pushover.apiUrl');
  }

  private timeout() {
    return this.config.get<number>('pushover.timeoutMs');
  }

  private mensajeError(e: unknown): string {
    if (
      isAxiosError<{ errors?: string[] }>(e) &&
      e.response?.data?.errors?.length
    ) {
      return e.response.data.errors.join(', ');
    }
    return (e as Error).message;
  }
}
