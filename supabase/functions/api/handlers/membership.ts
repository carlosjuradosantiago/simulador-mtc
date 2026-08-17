import { getSupabaseClient } from '../_shared/supabase.ts';
import { getUserFromToken } from '../_shared/auth.ts';
import { jsonResponse, errorResponse, unauthorizedResponse } from '../_shared/response.ts';
import {
  FREE_FULL_EXAM_ATTEMPTS,
  getFullPracticeAccess,
  isFullExamFree,
} from '../_shared/membership-access.ts';

// Helper to parse features from DB (can be JSON array, string, or comma-separated)
function parseFeatures(features: any): string[] {
  if (!features) return [];
  if (Array.isArray(features)) return features;
  if (typeof features === 'string') {
    try {
      const parsed = JSON.parse(features);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return features.split(/[,\n]/).map((f: string) => f.trim()).filter((f: string) => f);
    }
  }
  return [];
}

// GET /api/membership-plans - Public endpoint
export async function handleGetMembershipPlans(_req: Request) {
  try {
    const supabase = getSupabaseClient();
    const { data: plans, error } = await supabase
      .from('planes_membresia')
      .select('*')
      .eq('esta_activo', true)
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching plans:', error.message);
      return errorResponse('Error al obtener planes de membresía: ' + error.message, 500);
    }
    return jsonResponse((plans || []).map((p: any) => ({
      id: p.id,
      name: p.nombre,
      description: p.descripcion,
      price: parseFloat(p.precio),
      durationMonths: p.duracion_meses,
      features: parseFeatures(p.caracteristicas),
      isPromotion: false,
      originalPrice: null,
      examTypeId: p.id_tipo_examen
    })));
  } catch (err) {
    console.error('Get membership plans error:', err);
    return errorResponse('Error interno del servidor', 500);
  }
}
// GET /api/membership-plans/exam-type/:examTypeId/active - Get active plans by exam type
export async function handleGetMembershipPlansByExamType(_req, examTypeId) {
  try {
    const supabase = getSupabaseClient();
    console.log(`Fetching active membership plans for exam type: ${examTypeId}`);
    
    // Fetch active plans filtered by id_tipo_examen and esta_activo (Spanish columns)
    const { data: plans, error } = await supabase
      .from('planes_membresia')
      .select('*')
      .eq('id_tipo_examen', examTypeId)
      .eq('esta_activo', true)
      .order('precio', { ascending: true });
    
    if (error) {
      console.error('Error fetching plans by exam type:', error.message);
      return errorResponse('Error al obtener planes de membresía: ' + error.message, 500);
    }
    
    console.log(`Raw plans from DB:`, JSON.stringify(plans, null, 2));
    
    // Map to frontend expected format (from Spanish to English keys)
    const mappedPlans = (plans || []).map((p) => ({
      id: p.id,
      name: p.nombre,
      description: p.descripcion,
      price: parseFloat(p.precio),
      durationMonths: p.duracion_meses,
      features: parseFeatures(p.caracteristicas),
      isPromotion: false,
      originalPrice: null,
      examTypeId: p.id_tipo_examen
    }));
    
    console.log(`Found ${mappedPlans.length} active plans for exam type ${examTypeId}`);
    console.log(`Mapped plans:`, JSON.stringify(mappedPlans, null, 2));
    
    return jsonResponse(mappedPlans);
  } catch (err) {
    console.error('Get membership plans by exam type error:', err);
    return errorResponse('Error interno del servidor', 500);
  }
}
// GET /api/membership-plans/:planId
export async function handleGetMembershipPlan(_req: Request, planId: string) {
  try {
    const supabase = getSupabaseClient();
    const { data: plan, error } = await supabase
      .from('planes_membresia')
      .select('*')
      .eq('id', planId)
      .single();

    if (error || !plan) {
      return errorResponse('Plan de membresía no encontrado', 404);
    }
    return jsonResponse({
      id: plan.id,
      name: plan.nombre,
      description: plan.descripcion,
      price: parseFloat(plan.precio),
      durationMonths: plan.duracion_meses,
      features: parseFeatures(plan.caracteristicas),
      isPromotion: false,
      originalPrice: null,
      examTypeId: plan.id_tipo_examen
    });
  } catch (err) {
    console.error('Get membership plan error:', err);
    return errorResponse('Error interno del servidor', 500);
  }
}
// GET /api/user/memberships - Requires auth
export async function handleGetUserMemberships(req: Request) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return unauthorizedResponse();
    }
    const supabase = getSupabaseClient();
    const { data: memberships, error } = await supabase
      .from('membresias_usuario')
      .select(`
        *,
        plan:id_plan_membresia(id, nombre, descripcion, precio, duracion_meses, caracteristicas)
      `)
      .eq('id_usuario', user.userId)
      .order('creado_en', { ascending: false });

    if (error) {
      console.error('Error fetching memberships:', error.message);
      return errorResponse('Error al obtener membresías: ' + error.message, 500);
    }
    return jsonResponse(memberships || []);
  } catch (err) {
    console.error('Get user memberships error:', err);
    return errorResponse('Error interno del servidor', 500);
  }
}
// GET /api/user/membership/active - Check if user has active membership
// Returns UserActiveMembership format expected by frontend
export async function handleGetActiveMembership(req: Request) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return unauthorizedResponse();
    }
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    const { data: membership, error } = await supabase
      .from('membresias_usuario')
      .select(`
        id,
        fecha_inicio,
        fecha_fin,
        esta_activa,
        plan:id_plan_membresia(id, nombre, descripcion, precio, duracion_meses, caracteristicas)
      `)
      .eq('id_usuario', user.userId)
      .eq('esta_activa', true)
      .gte('fecha_fin', now)
      .order('fecha_fin', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Si no hay membresía activa, devolver null (200 OK)
    if (error || !membership) {
      if (error) {
        console.error('Error fetching active membership:', error.message);
      }
      return jsonResponse(null);
    }

    // Devolver en formato UserActiveMembership que espera el frontend
    return jsonResponse({
      id: membership.id,
      planName: membership.plan?.nombre || 'Plan Premium',
      planDescription: membership.plan?.descripcion || '',
      planPrice: membership.plan?.precio ? parseFloat(membership.plan.precio) : 0,
      durationMonths: membership.plan?.duracion_meses || 1,
      features: parseFeatures(membership.plan?.caracteristicas),
      startDate: membership.fecha_inicio,
      endDate: membership.fecha_fin,
      isActive: membership.esta_activa === true
    });
  } catch (err) {
    console.error('Get active membership error:', err);
    return errorResponse('Error interno del servidor', 500);
  }
}
// POST /api/user/membership/subscribe - Subscribe to a plan
export async function handleSubscribePlan(req: Request) {
  const user = await getUserFromToken(req);
  if (!user) {
    return unauthorizedResponse();
  }

  return errorResponse(
    'La activación directa fue deshabilitada. Usa el flujo de pago para activar una membresía.',
    410,
  );
}

// ============ EXAM COUNT ============

/**
 * GET /api/user/exam-count - Get the number of completed exams for the user
 * Only complete timed simulations count toward readiness.
 */
export async function handleGetUserExamCount(req: Request) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return unauthorizedResponse();
    }
    const supabase = getSupabaseClient();

    const freeAccess = Deno.env.get('FULL_EXAM_FREE_ACCESS');
    const access = await getFullPracticeAccess(supabase, user.userId, freeAccess);
    const remainingFreeExams = Math.max(FREE_FULL_EXAM_ATTEMPTS - access.completedAttempts, 0);

    return jsonResponse({
      examCount: access.completedAttempts,
      freeExamLimit: FREE_FULL_EXAM_ATTEMPTS,
      remainingFreeExams,
      canTakeExam: access.allowed,
      hasActiveMembership: access.hasActiveMembership,
      requiresPayment: !isFullExamFree(freeAccess) && !access.allowed,
    });
  } catch (err) {
    console.error('Get user exam count error:', err);
    return errorResponse('Error interno del servidor', 500);
  }
}
