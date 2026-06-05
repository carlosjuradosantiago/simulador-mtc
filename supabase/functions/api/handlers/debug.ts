/**
 * Debug Handler - Endpoints temporales para testing
 * ELIMINAR ANTES DE PASAR A PRODUCCIÓN
 */

import { getSupabaseClient } from '../_shared/supabase.ts';
import { getUserFromToken } from '../_shared/auth.ts';
import { jsonResponse } from '../_shared/response.ts';

/**
 * DELETE /debug/membership - Eliminar membresía activa del usuario
 */
export async function handleDeleteMembership(req: Request): Promise<Response> {
  const user = await getUserFromToken(req);
  if (!user) {
    return jsonResponse({ error: 'No autorizado' }, 401);
  }

  const supabase = getSupabaseClient();

  // Eliminar membresías activas del usuario
  const { data, error } = await supabase
    .from('membresias_usuario')
    .delete()
    .eq('id_usuario', user.userId);

  if (error) {
    console.error('❌ Error eliminando membresía:', error);
    return jsonResponse({ error: 'Error al eliminar membresía: ' + error.message }, 500);
  }

  // También limpiar historial de membresías (opcional)
  await supabase
    .from('historial_membresias')
    .delete()
    .eq('id_usuario', user.userId);

  console.log(`🗑️ [DEBUG] Membresía eliminada para usuario ${user.userId}`);
  return jsonResponse({ 
    success: true, 
    message: 'Membresía eliminada correctamente',
    userId: user.userId
  });
}

/**
 * DELETE /debug/exam-attempts - Eliminar todos los intentos de examen del usuario
 * Esto resetea el contador de exámenes completados
 */
export async function handleDeleteExamAttempts(req: Request): Promise<Response> {
  const user = await getUserFromToken(req);
  if (!user) {
    return jsonResponse({ error: 'No autorizado' }, 401);
  }

  const supabase = getSupabaseClient();

  // Eliminar sesiones de práctica del usuario
  const { data: sessions, error: sessionsError } = await supabase
    .from('sesion_practica')
    .delete()
    .eq('id_usuario', user.userId);

  if (sessionsError) {
    console.error('❌ Error eliminando sesiones:', sessionsError);
    return jsonResponse({ error: 'Error al eliminar intentos: ' + sessionsError.message }, 500);
  }

  // También eliminar respuestas de práctica del usuario
  const { error: answersError } = await supabase
    .from('respuesta_practica_usuario')
    .delete()
    .eq('id_usuario', user.userId);

  if (answersError) {
    console.error('⚠️ Error eliminando respuestas (no crítico):', answersError);
  }

  console.log(`🗑️ [DEBUG] Intentos de examen eliminados para usuario ${user.userId}`);
  return jsonResponse({ 
    success: true, 
    message: 'Intentos de examen eliminados correctamente',
    userId: user.userId
  });
}
