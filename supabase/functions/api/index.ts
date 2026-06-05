// Supabase Edge Function - Main API Router
// Migrated from Spring Boot backend to Supabase Edge Functions
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withLogging } from './_shared/logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-auth-token, x-mtc-import-token',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};
console.log("API Edge Function starting...");
Deno.serve(async (req)=>{
  console.log("Request received:", req.method, req.url);
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  const url = new URL(req.url);
  let path = url.pathname;
  
  // La URL completa es: /functions/v1/api/ruta
  // Necesitamos extraer solo /ruta
  
  // Eliminar el prefijo de la función de Supabase
  if (path.startsWith('/functions/v1/api')) {
    path = path.replace('/functions/v1/api', '');
  } else if (path.startsWith('/api')) {
    // En caso de que llegue sin el prefijo /functions/v1
    path = path.replace('/api', '');
  }
  
  // Asegurar que el path empiece con /
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  
  const method = req.method;
  console.log(`[API] ${method} ${path}`);
  try {
    // ============ HEALTH CHECK ============
    if (path === '/health' || path === '' || path === '/') {
      return new Response(JSON.stringify({
        status: 'ok',
        path,
        timestamp: new Date().toISOString()
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // ============ ADMIN IMPORT ROUTES ============
    if (path === '/admin/mtc-import/questions' && method === 'POST') {
      const { handleMtcImportQuestions } = await import('./handlers/mtc_import.ts');
      return await withLogging(req, path, 'handleMtcImportQuestions', () => handleMtcImportQuestions(req));
    }
    if (path === '/admin/mtc-import/finalize' && method === 'POST') {
      const { handleMtcImportFinalize } = await import('./handlers/mtc_import.ts');
      return await withLogging(req, path, 'handleMtcImportFinalize', () => handleMtcImportFinalize(req));
    }
    if (path === '/admin/mtc-import/update-questions' && method === 'POST') {
      const { handleMtcImportUpdateQuestions } = await import('./handlers/mtc_import.ts');
      return await withLogging(req, path, 'handleMtcImportUpdateQuestions', () => handleMtcImportUpdateQuestions(req));
    }
    if (path === '/admin/overview' && method === 'GET') {
      const { handleGetAdminOverview } = await import('./handlers/admin.ts');
      return await withLogging(req, path, 'handleGetAdminOverview', () => handleGetAdminOverview(req));
    }
    if (path === '/admin/export' && method === 'GET') {
      const { handleExportAdminReport } = await import('./handlers/admin.ts');
      return await withLogging(req, path, 'handleExportAdminReport', () => handleExportAdminReport(req));
    }
    if (path === '/analytics/event' && method === 'POST') {
      const { handleTrackEvent } = await import('./handlers/analytics.ts');
      return await withLogging(req, path, 'handleTrackEvent', () => handleTrackEvent(req));
    }
    // ============ AUTH ROUTES ============
    if (path === '/auth/login' && method === 'POST') {
      const { handleLogin } = await import('./handlers/auth.ts');
      return await withLogging(req, path, 'handleLogin', () => handleLogin(req));
    }
    if (path === '/auth/register' && method === 'POST') {
      const { handleRegister } = await import('./handlers/auth.ts');
      return await withLogging(req, path, 'handleRegister', () => handleRegister(req));
    }
    if (path === '/auth/verify-email' && method === 'POST') {
      const { handleVerifyEmail } = await import('./handlers/auth.ts');
      return await withLogging(req, path, 'handleVerifyEmail', () => handleVerifyEmail(req));
    }
    if (path === '/auth/resend-verification' && method === 'POST') {
      const { handleResendVerification } = await import('./handlers/auth.ts');
      return await withLogging(req, path, 'handleResendVerification', () => handleResendVerification(req));
    }
    if (path === '/auth/password-reset/request' && method === 'POST') {
      const { handlePasswordResetRequest } = await import('./handlers/auth.ts');
      return await withLogging(req, path, 'handlePasswordResetRequest', () => handlePasswordResetRequest(req));
    }
    if (path === '/auth/password-reset/confirm' && method === 'POST') {
      const { handlePasswordResetConfirm } = await import('./handlers/auth.ts');
      return await withLogging(req, path, 'handlePasswordResetConfirm', () => handlePasswordResetConfirm(req));
    }
    // ============ CATEGORIES ROUTES ============
    const categoriesMatch = path.match(/^\/categories\/tipo-examen\/(\d+)$/);
    if (categoriesMatch && method === 'GET') {
      const { handleGetCategories } = await import('./handlers/categories.ts');
      return await withLogging(req, path, 'handleGetCategories', () => handleGetCategories(req, categoriesMatch[1]));
    }
    if (path === '/question-bank' && method === 'GET') {
      const { handleGetQuestionBank } = await import('./handlers/question-bank.ts');
      return await withLogging(req, path, 'handleGetQuestionBank', () => handleGetQuestionBank(req));
    }
    if (path === '/classes' && method === 'GET') {
      const { handleGetClasses } = await import('./handlers/classes.ts');
      return await withLogging(req, path, 'handleGetClasses', () => handleGetClasses(req));
    }
    const classProgressMatch = path.match(/^\/classes\/(\d+)\/progress$/);
    if (classProgressMatch && method === 'PUT') {
      const { handleUpdateClassProgress } = await import('./handlers/classes.ts');
      return await withLogging(req, path, 'handleUpdateClassProgress', () => handleUpdateClassProgress(req, classProgressMatch[1]));
    }
    if (path === '/ranking' && method === 'GET') {
      const { handleGetRanking } = await import('./handlers/ranking.ts');
      return await withLogging(req, path, 'handleGetRanking', () => handleGetRanking(req));
    }
    // ============ PRACTICA ROUTES ============
    // Route with tipo-examen and categoria in path
    const iniciarPracticaMatch = path.match(/^\/practica-temporal\/iniciar\/tipo-examen\/(\d+)\/categoria\/(\d+)$/);
    if (iniciarPracticaMatch && method === 'POST') {
      const { handleIniciarPractica } = await import('./handlers/practica.ts');
      return await withLogging(req, path, 'handleIniciarPractica', () => handleIniciarPractica(req, iniciarPracticaMatch[1], iniciarPracticaMatch[2]));
    }
    
    // Legacy route (if still needed)
    if (path === '/practica-temporal/iniciar' && method === 'POST') {
      const { handleIniciarPractica } = await import('./handlers/practica.ts');
      return await withLogging(req, path, 'handleIniciarPractica', () => handleIniciarPractica(req));
    }
    const estadoMatch = path.match(/^\/practica\/estado\/(\d+)$/);
    if (estadoMatch && method === 'GET') {
      const { handleGetEstadoPractica } = await import('./handlers/practica.ts');
      return await withLogging(req, path, 'handleGetEstadoPractica', () => handleGetEstadoPractica(req, estadoMatch[1]));
    }
    const finalizarMatch = path.match(/^\/practica\/finalizar\/(\d+)$/);
    if (finalizarMatch && method === 'POST') {
      const { handleFinalizarPractica } = await import('./handlers/practica.ts');
      return await withLogging(req, path, 'handleFinalizarPractica', () => handleFinalizarPractica(req, finalizarMatch[1]));
    }
    const mediaMatch = path.match(/^\/practica\/media\/(\d+)$/);
    if (mediaMatch && method === 'GET') {
      const { handleGetMedia } = await import('./handlers/practica.ts');
      return await withLogging(req, path, 'handleGetMedia', () => handleGetMedia(req, mediaMatch[1]));
    }
    
    // 🆕 GUARDAR RESPUESTA INDIVIDUAL
    const respuestaMatch = path.match(/^\/practica\/(\d+)\/respuesta$/);
    if (respuestaMatch && method === 'POST') {
      const { handleGuardarRespuesta } = await import('./handlers/respuestas.ts');
      return await withLogging(req, path, 'handleGuardarRespuesta', () => handleGuardarRespuesta(req, respuestaMatch[1]));
    }
    
    // ============ PREGUNTAS/EXAMEN ROUTES ============
    // 🔧 CORREGIDO: Agregado /tipo-examen/ en la ruta
    const examenMatch = path.match(/^\/preguntas\/examen-cronometrado\/tipo-examen\/(\d+)\/categoria\/(\d+)$/);
    if (examenMatch && method === 'GET') {
      const { handleExamenCronometrado } = await import('./handlers/preguntas.ts');
      return await withLogging(req, path, 'handleExamenCronometrado', () => handleExamenCronometrado(req, examenMatch[1], examenMatch[2]));
    }
    // ============ EXAM SUBMISSION ROUTES ============
    if (path === '/exams/submit' && method === 'POST') {
      const { handleSubmitExam } = await import('./handlers/exams.ts');
      return await withLogging(req, path, 'handleSubmitExam', () => handleSubmitExam(req));
    }
    if (path === '/practica/responder' && method === 'POST') {
      const { handleSubmitAnswer } = await import('./handlers/exams.ts');
      return await withLogging(req, path, 'handleSubmitAnswer', () => handleSubmitAnswer(req));
    }
    // ============ USER ROUTES ============
    if (path === '/user/profile' && method === 'GET') {
      const { handleGetProfile } = await import('./handlers/user.ts');
      return await withLogging(req, path, 'handleGetProfile', () => handleGetProfile(req));
    }
    if (path === '/user/exam-history' && method === 'GET') {
      const { handleGetExamHistory } = await import('./handlers/user.ts');
      return await withLogging(req, path, 'handleGetExamHistory', () => handleGetExamHistory(req));
    }
    if (path === '/user/exam-history/recent' && method === 'GET') {
      const { handleGetRecentHistory } = await import('./handlers/user.ts');
      return await withLogging(req, path, 'handleGetRecentHistory', () => handleGetRecentHistory(req));
    }
    const attemptMatch = path.match(/^\/user\/exam-history\/(\d+)$/);
    if (attemptMatch && method === 'GET') {
      const { handleGetAttemptDetail } = await import('./handlers/user.ts');
      return await withLogging(req, path, 'handleGetAttemptDetail', () => handleGetAttemptDetail(req, attemptMatch[1]));
    }
    if (path === '/user/stats' && method === 'GET') {
      const { handleGetUserStats } = await import('./handlers/user.ts');
      return await withLogging(req, path, 'handleGetUserStats', () => handleGetUserStats(req));
    }
    if (path === '/user/settings' && method === 'GET') {
      const { handleGetSettings } = await import('./handlers/settings.ts');
      return await withLogging(req, path, 'handleGetSettings', () => handleGetSettings(req));
    }
    if (path === '/user/settings' && method === 'PUT') {
      const { handleUpdateSettings } = await import('./handlers/settings.ts');
      return await withLogging(req, path, 'handleUpdateSettings', () => handleUpdateSettings(req));
    }
    // GET/PUT /user/billing-data
    if (path === '/user/billing-data' && method === 'GET') {
      const { handleGetBillingData } = await import('./handlers/user.ts');
      return await withLogging(req, path, 'handleGetBillingData', () => handleGetBillingData(req));
    }
    if (path === '/user/billing-data' && method === 'PUT') {
      const { handleUpdateBillingData } = await import('./handlers/user.ts');
      return await withLogging(req, path, 'handleUpdateBillingData', () => handleUpdateBillingData(req));
    }
    // ============ MEMBERSHIP ROUTES ============
    if (path === '/membership-plans' && method === 'GET') {
      const { handleGetMembershipPlans } = await import('./handlers/membership.ts');
      return await withLogging(req, path, 'handleGetMembershipPlans', () => handleGetMembershipPlans(req));
    }
    // GET /membership-plans/exam-type/:examTypeId/active
    const plansExamTypeMatch = path.match(/^\/membership-plans\/exam-type\/(\d+)\/active$/);
    if (plansExamTypeMatch && method === 'GET') {
      const { handleGetMembershipPlansByExamType } = await import('./handlers/membership.ts');
      return await withLogging(req, path, 'handleGetMembershipPlansByExamType', () => handleGetMembershipPlansByExamType(req, plansExamTypeMatch[1]));
    }
    const planMatch = path.match(/^\/membership-plans\/(\d+)$/);
    if (planMatch && method === 'GET') {
      const { handleGetMembershipPlan } = await import('./handlers/membership.ts');
      return await withLogging(req, path, 'handleGetMembershipPlan', () => handleGetMembershipPlan(req, planMatch[1]));
    }
    if (path === '/user/memberships' && method === 'GET') {
      const { handleGetUserMemberships } = await import('./handlers/membership.ts');
      return await withLogging(req, path, 'handleGetUserMemberships', () => handleGetUserMemberships(req));
    }
    if (path === '/user/membership/active' && method === 'GET') {
      const { handleGetActiveMembership } = await import('./handlers/membership.ts');
      return await withLogging(req, path, 'handleGetActiveMembership', () => handleGetActiveMembership(req));
    }
    if (path === '/user/membership/subscribe' && method === 'POST') {
      const { handleSubscribePlan } = await import('./handlers/membership.ts');
      return await withLogging(req, path, 'handleSubscribePlan', () => handleSubscribePlan(req));
    }
    
    // GET /user/exam-count - Check how many completed exams the user has
    if (path === '/user/exam-count' && method === 'GET') {
      const { handleGetUserExamCount } = await import('./handlers/membership.ts');
      return await withLogging(req, path, 'handleGetUserExamCount', () => handleGetUserExamCount(req));
    }
    
    // ============ PAGOS (CULQI) ============
    if (path === '/pagos/config' && method === 'GET') {
      const { handleGetCulqiConfig } = await import('./handlers/pagos.ts');
      return await withLogging(req, path, 'handleGetCulqiConfig', () => handleGetCulqiConfig(req));
    }
    if (path === '/pagos/procesar' && method === 'POST') {
      const { handleProcesarPago } = await import('./handlers/pagos.ts');
      return await withLogging(req, path, 'handleProcesarPago', () => handleProcesarPago(req));
    }
    if (path === '/pagos/historial' && method === 'GET') {
      const { handleGetHistorialPagos } = await import('./handlers/pagos.ts');
      return await withLogging(req, path, 'handleGetHistorialPagos', () => handleGetHistorialPagos(req));
    }
    
    // ============ LIBRO DE RECLAMACIONES (INDECOPI) ============
    if (path === '/libro-reclamaciones' && method === 'POST') {
      const { handleRegistrarReclamo } = await import('./handlers/libro_reclamaciones.ts');
      return await withLogging(req, path, 'handleRegistrarReclamo', () => handleRegistrarReclamo(req));
    }
    if (path === '/libro-reclamaciones/info' && method === 'GET') {
      const { handleGetProveedorInfo } = await import('./handlers/libro_reclamaciones.ts');
      return await withLogging(req, path, 'handleGetProveedorInfo', () => handleGetProveedorInfo(req));
    }
    if (path === '/libro-reclamaciones/setup' && method === 'POST') {
      return new Response(JSON.stringify({
        error: 'Gone',
        message: 'La creación/modificación de tablas debe ejecutarse por migraciones, no desde la edge function.'
      }), {
        status: 410,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const reclamoMatch = path.match(/^\/libro-reclamaciones\/([A-Z0-9-]+)$/);
    if (reclamoMatch && method === 'GET') {
      const { handleConsultarReclamo } = await import('./handlers/libro_reclamaciones.ts');
      return await withLogging(req, path, 'handleConsultarReclamo', () => handleConsultarReclamo(req, reclamoMatch[1]));
    }
    // ============ DEBUG DISABLED IN PRODUCTION ============
    if (path === '/debug/membership' && method === 'DELETE') {
      return new Response(JSON.stringify({
        error: 'Gone',
        message: 'Ruta debug deshabilitada en producción.'
      }), {
        status: 410,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    if (path === '/debug/exam-attempts' && method === 'DELETE') {
      return new Response(JSON.stringify({
        error: 'Gone',
        message: 'Ruta debug deshabilitada en producción.'
      }), {
        status: 410,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // ============ 404 NOT FOUND ============
    return new Response(JSON.stringify({
      error: 'Not Found',
      message: `Ruta no encontrada: ${method} ${path}`,
      availableRoutes: [
        'GET /health',
        'GET /admin/overview',
        'GET /admin/export',
        'POST /analytics/event',
        'POST /auth/login',
        'POST /auth/register',
        'POST /auth/verify-email',
        'POST /auth/resend-verification',
        'POST /auth/password-reset/request',
        'POST /auth/password-reset/confirm',
        'GET /categories/tipo-examen/:id',
        'GET /question-bank',
        'GET /classes',
        'PUT /classes/:classId/progress',
        'GET /ranking',
        'POST /practica-temporal/iniciar',
        'GET /practica/estado/:sessionId',
        'POST /practica/finalizar/:sessionId',
        'GET /practica/media/:multimediaId',
        'GET /preguntas/examen-cronometrado/tipo-examen/:tipoExamenId/categoria/:categoriaId',
        'POST /exams/submit',
        'POST /practica/responder',
        'GET /user/profile',
        'GET /user/exam-history',
        'GET /user/exam-history/recent',
        'GET /user/exam-history/:attemptId',
        'GET /user/stats',
        'GET /user/settings',
        'PUT /user/settings',
        'GET /user/billing-data',
        'PUT /user/billing-data',
        'GET /membership-plans',
        'GET /membership-plans/exam-type/:examTypeId/active',
        'GET /membership-plans/:planId',
        'GET /user/memberships',
        'GET /user/membership/active',
        'GET /user/exam-count',
        'POST /user/membership/subscribe',
        'GET /pagos/config',
        'POST /pagos/procesar',
        'GET /pagos/historial',
        'POST /libro-reclamaciones',
        'GET /libro-reclamaciones/info',
        'GET /libro-reclamaciones/:numeroReclamo'
      ]
    }), {
      status: 404,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    console.error('[API] Unhandled error:', err);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: String(err)
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
