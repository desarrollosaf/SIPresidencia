import { registerAs } from '@nestjs/config';

// Avisos al equipo por Pushover: suenan en el iPhone aunque esté en silencio (alerta crítica).
// Cada aviso son dos alertas: una al momento y otra repetirSegundos después; ninguna insiste
// ni hay que confirmarla en la app.
export default registerAs('pushover', () => ({
  // Token de la aplicación creada en https://pushover.net/apps/build
  token: process.env.PUSHOVER_TOKEN,
  apiUrl: process.env.PUSHOVER_API_URL ?? 'https://api.pushover.net/1',
  // Sonido por omisión si la persona no tiene uno propio (vibrate = solo vibra).
  sonido: process.env.PUSHOVER_SONIDO ?? 'persistent',
  // Segundos entre la primera y la segunda alerta (0 = solo una).
  repetirSegundos: parseInt(process.env.PUSHOVER_REPETIR_SEGUNDOS ?? '5', 10),
  // Mínimo de segundos entre dos avisos a la misma persona.
  esperaSegundos: parseInt(process.env.PUSHOVER_ESPERA_SEGUNDOS ?? '30', 10),
  timeoutMs: parseInt(process.env.PUSHOVER_TIMEOUT_MS ?? '8000', 10),
  // /tableta abre "Llamar" sin iniciar sesión. Vacía = abierta; con valor exige /tableta?llave=….
  tabletaLlave: process.env.TABLETA_LLAVE ?? '',
}));
