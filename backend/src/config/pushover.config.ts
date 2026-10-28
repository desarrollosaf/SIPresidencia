import { registerAs } from '@nestjs/config';

// Avisos al equipo por Pushover: suenan en el iPhone aunque esté en silencio (alerta crítica)
// y se repiten hasta que la persona los confirma en la app.
export default registerAs('pushover', () => ({
  // Token de la aplicación creada en https://pushover.net/apps/build
  token: process.env.PUSHOVER_TOKEN,
  apiUrl: process.env.PUSHOVER_API_URL ?? 'https://api.pushover.net/1',
  // Sonido por omisión si la persona no tiene uno propio (vibrate = solo vibra).
  sonido: process.env.PUSHOVER_SONIDO ?? 'persistent',
  // Cada cuántos segundos se repite (mínimo 30) y hasta cuándo deja de insistir (máximo 10800).
  reintentoSegundos: parseInt(
    process.env.PUSHOVER_REINTENTO_SEGUNDOS ?? '30',
    10,
  ),
  expiraSegundos: parseInt(process.env.PUSHOVER_EXPIRA_SEGUNDOS ?? '10800', 10),
  // Mínimo de segundos entre dos avisos a la misma persona.
  esperaSegundos: parseInt(process.env.PUSHOVER_ESPERA_SEGUNDOS ?? '30', 10),
  timeoutMs: parseInt(process.env.PUSHOVER_TIMEOUT_MS ?? '8000', 10),
}));
