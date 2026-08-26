export const AUTH_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
export const AUTH_ACTIVITY_KEY = 'simulamanejo:last-auth-activity';
export const AUTH_INACTIVITY_BROADCAST_KEY = 'simulamanejo:auth-inactivity-expired';
export const AUTH_INACTIVITY_NOTICE_KEY = 'simulamanejo:auth-inactivity-notice';
export const AUTH_INACTIVITY_NOTICE = 'Cerramos tu sesión por seguridad después de 30 minutos sin actividad. Vuelve a iniciar sesión para continuar.';

export function isAuthSessionInactive(lastActivityAt, now = Date.now()) {
  const timestamp = Number(lastActivityAt);
  return Number.isFinite(timestamp)
    && timestamp > 0
    && now - timestamp >= AUTH_INACTIVITY_TIMEOUT_MS;
}
