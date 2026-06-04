import { getSupabaseClient } from '../_shared/supabase.ts';
import { getUserFromToken } from '../_shared/auth.ts';
import { jsonResponse, errorResponse, unauthorizedResponse } from '../_shared/response.ts';

function toDto(settings: any) {
  return {
    categoriaPreferidaId: settings?.categoria_preferida_id ?? null,
    notificacionesHabilitadas: settings?.notificaciones_habilitadas ?? true,
    tema: settings?.tema ?? 'light',
    actualizadoEn: settings?.actualizado_en ?? null
  };
}

export async function handleGetSettings(req: Request) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return unauthorizedResponse();
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('configuracion_usuario')
      .select('*')
      .eq('id_usuario', user.userId)
      .maybeSingle();

    if (error) {
      return errorResponse('Error al obtener configuración: ' + error.message, 500);
    }

    return jsonResponse(toDto(data));
  } catch (err) {
    console.error('Settings get error:', err);
    return errorResponse('Error interno del servidor', 500);
  }
}

export async function handleUpdateSettings(req: Request) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return unauthorizedResponse();
    }

    const body = await req.json();
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    const payload = {
      id_usuario: user.userId,
      categoria_preferida_id: body.categoriaPreferidaId ?? body.preferredCategoryId ?? null,
      notificaciones_habilitadas: body.notificacionesHabilitadas ?? body.notificationsEnabled ?? true,
      tema: body.tema ?? body.theme ?? 'light',
      actualizado_en: now
    };

    const { data, error } = await supabase
      .from('configuracion_usuario')
      .upsert(payload, { onConflict: 'id_usuario' })
      .select('*')
      .single();

    if (error) {
      return errorResponse('Error al actualizar configuración: ' + error.message, 500);
    }

    return jsonResponse(toDto(data));
  } catch (err) {
    console.error('Settings update error:', err);
    return errorResponse('Error interno del servidor', 500);
  }
}
