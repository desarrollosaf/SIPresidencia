import { registerAs } from '@nestjs/config';

export default registerAs('registro', () => ({
  apiUrl: process.env.REGISTRO_API_URL ?? 'http://host.docker.internal:3013',
  timeoutMs: parseInt(process.env.REGISTRO_API_TIMEOUT_MS ?? '15000', 10),
}));
