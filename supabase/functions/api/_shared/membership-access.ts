import { OFFICIAL_EXAM_QUESTION_COUNT } from './exam-rules.ts';

export const TIMED_SESSION_TYPE = 'CRONOMETRADO';
export const QUICK_SESSION_TYPE = 'PRACTICA_CORTA';
export const ADAPTIVE_SESSION_TYPE = 'PRACTICA_ADAPTATIVA';
export const FULL_PRACTICE_SESSION_TYPES = [TIMED_SESSION_TYPE, ADAPTIVE_SESSION_TYPE, 'PRACTICA'];
export const SIMULATED_PAYMENT_METHOD = 'simulacion';
export const FREE_FULL_EXAM_ATTEMPTS = 5;

export function isFullExamFree(value?: string | null) {
  return String(value ?? 'false').trim().toLowerCase() === 'true';
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
  const adaptive: T[] = [];
  const ignored: T[] = [];

  attempts.forEach((attempt) => {
    if (
      attempt.tipo_intento === TIMED_SESSION_TYPE
      && Number(attempt.total_preguntas) === OFFICIAL_EXAM_QUESTION_COUNT
    ) {
      timed.push(attempt);
    } else if (attempt.tipo_intento === QUICK_SESSION_TYPE) {
      quick.push(attempt);
    } else if (attempt.tipo_intento === ADAPTIVE_SESSION_TYPE) {
      adaptive.push(attempt);
    } else {
      ignored.push(attempt);
    }
  });

  return { timed, quick, adaptive, ignored };
}

export function filterFullPracticeAttempts(query: any, userId: number) {
  return query
    .eq('id_usuario', userId)
    .in('tipo_intento', FULL_PRACTICE_SESSION_TYPES)
    .eq('total_preguntas', OFFICIAL_EXAM_QUESTION_COUNT);
}

export async function getFullPracticeAccess(supabase: any, userId: number, freeAccessValue?: string | null) {
  if (isFullExamFree(freeAccessValue)) {
    return { allowed: true, completedAttempts: 0, hasActiveMembership: false };
  }

  const { data: activeMembership, error: membershipError } = await supabase
    .from('membresias_usuario')
    .select('id')
    .eq('id_usuario', userId)
    .eq('esta_activa', true)
    .gte('fecha_fin', new Date().toISOString())
    .limit(1)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (activeMembership) {
    return { allowed: true, completedAttempts: 0, hasActiveMembership: true };
  }

  const { count, error: attemptsError } = await filterFullPracticeAttempts(
    supabase.from('intento').select('id', { count: 'exact', head: true }),
    userId,
  );
  if (attemptsError) throw attemptsError;

  const completedAttempts = count || 0;
  return {
    allowed: hasFreeFullExamAttempt(completedAttempts),
    completedAttempts,
    hasActiveMembership: false,
  };
}

export function hasFreeFullExamAttempt(completedAttempts: number) {
  return Math.max(Number(completedAttempts) || 0, 0) < FREE_FULL_EXAM_ATTEMPTS;
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
