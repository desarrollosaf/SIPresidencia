import {
  BadGatewayException,
  GatewayTimeoutException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

// Sala donde viven los puentes (Raspberry Pi o contenedor) que tienen el P-6 conectado.
const SALA_PUENTES = 'p6-puentes';

export interface P6Ack {
  ok: boolean;
  error?: string;
  [clave: string]: unknown;
}

// Solo el puente de Python se conecta aquí; el navegador habla con el
// controlador HTTP (que sí pasa por el JWT del usuario).
@WebSocketGateway()
export class P6Gateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server: Server;

  private readonly logger = new Logger(P6Gateway.name);
  private ultimoEstado: unknown = null;

  constructor(private readonly config: ConfigService) {}

  handleConnection(client: Socket) {
    const esperado = this.config.get<string>('p6.bridgeToken');
    const recibido = (client.handshake.auth as { token?: string })?.token;

    if (!esperado) {
      this.logger.warn(
        'P6_BRIDGE_TOKEN no está definido en backend/.env; se rechaza el puente.',
      );
      client.disconnect(true);
      return;
    }
    if (recibido !== esperado) {
      this.logger.warn(`Puente rechazado por token inválido (${client.id})`);
      client.disconnect(true);
      return;
    }

    void client.join(SALA_PUENTES);
    this.logger.log(`Puente P-6 conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Puente P-6 desconectado: ${client.id}`);
  }

  @SubscribeMessage('p6:status')
  estadoDelPuente(@ConnectedSocket() client: Socket, @MessageBody() estado: unknown) {
    this.ultimoEstado = estado;
    this.logger.log(`Estado del puente ${client.id}: ${JSON.stringify(estado)}`);
  }

  async estado() {
    const puentes = await this.server.in(SALA_PUENTES).fetchSockets();
    return { conectado: puentes.length > 0, puentes: puentes.length, ultimoEstado: this.ultimoEstado };
  }

  // Envía el evento a todos los puentes y espera su confirmación (ack).
  async enviar(evento: string, datos: object): Promise<P6Ack[]> {
    const puentes = await this.server.in(SALA_PUENTES).fetchSockets();
    if (puentes.length === 0) {
      throw new ServiceUnavailableException('El puente del P-6 no está conectado.');
    }

    let respuestas: P6Ack[];
    try {
      respuestas = await this.server
        .to(SALA_PUENTES)
        .timeout(this.config.get<number>('p6.ackTimeoutMs') ?? 3000)
        .emitWithAck(evento, datos);
    } catch {
      throw new GatewayTimeoutException('El puente del P-6 no respondió a tiempo.');
    }

    const fallo = respuestas.find((r) => !r?.ok);
    if (fallo) {
      throw new BadGatewayException(fallo.error ?? 'El puente no pudo tocar el P-6.');
    }
    return respuestas;
  }
}
