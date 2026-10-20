import { registerAs } from '@nestjs/config';

// Integración con la app SPID: el presidente toca "Notificar al congreso" desde la app.
export default registerAs('spid', () => ({
  // API de SPID (Registro Parlamentario) contra la que se valida el token de la app.
  apiUrl: process.env.SPID_API_URL ?? 'https://parlamentario.congresoedomex.gob.mx',
  // Quién puede tocar el P-6 no se configura: es quien preside la Junta de Coordinación Política en SPID.
  // Pad que toca el botón; lo decide el servidor, la app no puede elegir otro.
  bank: process.env.SPID_P6_BANK ?? 'A',
  pad: parseInt(process.env.SPID_P6_PAD ?? '1', 10),
  // Mínimo de segundos entre avisos del mismo usuario.
  esperaSegundos: parseInt(process.env.SPID_P6_ESPERA_SEGUNDOS ?? '10', 10),
  timeoutMs: parseInt(process.env.SPID_API_TIMEOUT_MS ?? '8000', 10),
}));
