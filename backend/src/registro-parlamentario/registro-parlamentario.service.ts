import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

// Cliente de solo lectura hacia la API pública de SIRegistroParlamentario
// (angular/SIRegistroParlamentario). SIPresidencia no duplica ese modelo de
// datos: pasa la respuesta tal cual la entrega esa API.
@Injectable()
export class RegistroParlamentarioService {
  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private get baseUrl(): string {
    return this.configService.get<string>('registro.apiUrl')!;
  }

  private get timeout(): number {
    return this.configService.get<number>('registro.timeoutMs')!;
  }

  // Últimos eventos de tipo "Sesión" (1) o "Comisión" (2).
  async ultimosEventos(tipo: '1' | '2' = '1'): Promise<unknown> {
    return this.pedir('get', `/api/eventos/ultimoseventos/${tipo}`);
  }

  async eventosPorFecha(fecha: string): Promise<unknown> {
    return this.pedir('get', `/api/eventos/getagendaHoy/${fecha}`);
  }

  async agenda(idEvento: string): Promise<unknown> {
    return this.pedir('get', `/api/eventos/getagenda/${idEvento}`);
  }

  async puntos(idEvento: string): Promise<unknown> {
    return this.pedir('get', `/api/eventos/getpuntos/${idEvento}`);
  }

  async votosPunto(idPunto: string): Promise<unknown> {
    return this.pedir('post', '/api/eventos/getvotospunto/', { idPunto });
  }

  private async pedir(
    metodo: 'get' | 'post',
    ruta: string,
    datos?: unknown,
  ): Promise<unknown> {
    try {
      const respuesta = await firstValueFrom(
        this.http.request({
          method: metodo,
          url: `${this.baseUrl}${ruta}`,
          data: datos,
          timeout: this.timeout,
        }),
      );
      return respuesta.data;
    } catch {
      throw new BadGatewayException(
        'No se pudo conectar con SIRegistroParlamentario. Revisa que esté encendido.',
      );
    }
  }
}
