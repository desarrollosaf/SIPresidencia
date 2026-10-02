import { registerAs } from '@nestjs/config';

export default registerAs('p6', () => ({
  bridgeToken: process.env.P6_BRIDGE_TOKEN,
  ackTimeoutMs: parseInt(process.env.P6_ACK_TIMEOUT_MS ?? '3000', 10),
}));
