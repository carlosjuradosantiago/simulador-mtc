import { OFFICIAL_EXAM_QUESTION_COUNT } from './exam-rules.ts';

export const TIMED_SESSION_TYPE = 'CRONOMETRADO';
export const QUICK_SESSION_TYPE = 'PRACTICA_CORTA';
export const SIMULATED_PAYMENT_METHOD = 'simulacion';

export function isFullExamFree(value?: string | null) {
  return String(value ?? '').trim().toLowerCase() !== 'false';
}

export function filterOfficialExamAttempts(query: any, userId: number) {
  return query
    .eq('id_usuario', userId)
    .eq('tipo_intento', TIMED_SESSION_TYPE)
    .eq('total_preguntas', OFFICIAL_EXAM_QUESTION_COUNT);
}

export function addCalendarMonths(value: Date | string, months: number) {
  const result = new Date(value);
  const originalDay = result.getUTCDate();

  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + Math.max(1, Math.trunc(months) || 1));
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(originalDay, lastDay));

  return result;
}

export function partitionAttempts<T extends { tipo_intento?: string | null; total_preguntas?: number | null }>(attempts: T[]) {
  const timed: T[] = [];
  const quick: T[] = [];
  const ignored: T[] = [];

  attempts.forEach((attempt) => {
    if (
      attempt.tipo_intento === TIMED_SESSION_TYPE
      && Number(attempt.total_preguntas) === OFFICIAL_EXAM_QUESTION_COUNT
    ) {
      timed.push(attempt);
    } else if (attempt.tipo_intento === QUICK_SESSION_TYPE) {
      quick.push(attempt);
    } else {
      ignored.push(attempt);
    }
  });

  return { timed, quick, ignored };
}

export function isRealPayment(payment: {
  estado?: string | null;
  metodo_pago?: string | null;
  culqi_charge_id?: string | null;
  verificado_proveedor_en?: string | null;
}) {
  const status = String(payment.estado || '').toLowerCase();
  const chargeId = String(payment.culqi_charge_id || '');
  return ['exitoso', 'exitosa', 'pagado', 'pagada', 'paid', 'approved', 'aprobado', 'aprobada', 'success', 'succeeded'].includes(status)
    && payment.metodo_pago !== SIMULATED_PAYMENT_METHOD
    && Boolean(payment.verificado_proveedor_en)
    && chargeId.startsWith('chr_live_');
}
