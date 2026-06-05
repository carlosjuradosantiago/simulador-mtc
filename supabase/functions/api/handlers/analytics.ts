import { getUserFromToken } from '../_shared/auth.ts';
import { getSupabaseClient } from '../_shared/supabase.ts';
import { jsonResponse } from '../_shared/response.ts';

function hasAuthToken(req: Request) {
  return Boolean(req.headers.get('X-Auth-Token') || req.headers.get('Authorization'));
}

function cleanEventType(type: unknown) {
  const value = String(type || 'page_view').trim().toLowerCase();
  return value.replace(/[^a-z0-9_:-]/g, '').slice(0, 80) || 'page_view';
}

function cleanText(value: unknown, maxLength = 500) {
  if (value === null || value === undefined) return null;
  return String(value).slice(0, maxLength);
}

export async function handleTrackEvent(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const user = hasAuthToken(req) ? await getUserFromToken(req).catch(() => null) : null;
    const supabase = getSupabaseClient();

    const event = {
      tipo_evento: cleanEventType(body.type ?? body.tipoEvento),
      visitor_id: cleanText(body.visitorId ?? body.visitor_id, 128),
      id_usuario: user?.userId ?? null,
      ruta: cleanText(body.path ?? body.ruta, 500),
      titulo: cleanText(body.title ?? body.titulo, 250),
      referrer: cleanText(body.referrer, 500),
      user_agent: cleanText(req.headers.get('User-Agent'), 500),
      metadata: typeof body.metadata === 'object' && body.metadata !== null ? body.metadata : {},
    };

    const { error } = await supabase.from('eventos_analytics').insert(event);

    if (error) {
      if (error.code === '42P01') {
        return jsonResponse({ ok: false, skipped: true, reason: 'analytics_table_missing' });
      }

      console.error('Error tracking analytics event:', error);
      return jsonResponse({ ok: false, skipped: true });
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error('Track event error:', error);
    return jsonResponse({ ok: false, skipped: true });
  }
}
