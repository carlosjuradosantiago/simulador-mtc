import { getSupabaseClient } from '../_shared/supabase.ts';
import { jsonResponse, errorResponse } from '../_shared/response.ts';

export async function handleGetRanking(req: Request) {
  try {
    const url = new URL(req.url);
    const categoriaId = url.searchParams.get('categoriaId');
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20'), 1), 100);

    const supabase = getSupabaseClient();
    let query = supabase
      .from('vw_ranking_usuarios')
      .select('id_usuario, nombre_usuario, id_categoria, categoria, intentos, promedio, ultimo_intento')
      .not('intentos', 'eq', 0)
      .order('promedio', { ascending: false })
      .order('ultimo_intento', { ascending: false })
      .limit(limit);

    if (categoriaId) {
      query = query.eq('id_categoria', parseInt(categoriaId));
    }

    const { data, error } = await query;
    if (error) {
      return errorResponse('Error al obtener ranking: ' + error.message, 500);
    }

    return jsonResponse((data || []).map((row: any, index: number) => ({
      posicion: index + 1,
      idUsuario: row.id_usuario,
      username: row.nombre_usuario,
      categoriaId: row.id_categoria,
      categoria: row.categoria,
      intentos: Number(row.intentos || 0),
      promedio: Number(row.promedio || 0),
      ultimoIntento: row.ultimo_intento
    })));
  } catch (err) {
    console.error('Ranking error:', err);
    return errorResponse('Error interno del servidor', 500);
  }
}
