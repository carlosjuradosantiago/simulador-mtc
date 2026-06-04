import { getSupabaseClient } from '../_shared/supabase.ts';
import { getUserFromToken } from '../_shared/auth.ts';
import { jsonResponse, errorResponse, unauthorizedResponse } from '../_shared/response.ts';

export async function handleGetClasses(req: Request) {
  try {
    const supabase = getSupabaseClient();
    const user = await getUserFromToken(req).catch(() => null);

    const { data: classes, error } = await supabase
      .from('clases')
      .select('id, slug, titulo, descripcion, duracion_minutos, total_lecciones, orden, lecciones_clase(id, titulo, descripcion, duracion_minutos, orden)')
      .eq('esta_activa', true)
      .order('orden', { ascending: true });

    if (error) {
      return errorResponse('Error al obtener clases: ' + error.message, 500);
    }

    let progressByClass = new Map<number, any>();
    if (user?.userId) {
      const { data: progress } = await supabase
        .from('progreso_clase_usuario')
        .select('*')
        .eq('id_usuario', user.userId);

      progressByClass = new Map((progress || []).map((item: any) => [Number(item.id_clase), item]));
    }

    return jsonResponse((classes || []).map((clase: any) => {
      const progress = progressByClass.get(Number(clase.id));
      return {
        id: clase.id,
        slug: clase.slug,
        titulo: clase.titulo,
        descripcion: clase.descripcion,
        duracionMinutos: clase.duracion_minutos,
        totalLecciones: clase.total_lecciones,
        progresoPorcentaje: progress?.progreso_porcentaje ?? 0,
        leccionesCompletadas: progress?.lecciones_completadas ?? 0,
        lecciones: (clase.lecciones_clase || [])
          .sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0))
          .map((leccion: any) => ({
            id: leccion.id,
            titulo: leccion.titulo,
            descripcion: leccion.descripcion,
            duracionMinutos: leccion.duracion_minutos,
            orden: leccion.orden
          }))
      };
    }));
  } catch (err) {
    console.error('Classes error:', err);
    return errorResponse('Error interno del servidor', 500);
  }
}

export async function handleUpdateClassProgress(req: Request, classId: string) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return unauthorizedResponse();
    }

    const body = await req.json();
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('progreso_clase_usuario')
      .upsert({
        id_usuario: user.userId,
        id_clase: parseInt(classId),
        progreso_porcentaje: body.progresoPorcentaje ?? body.progressPercentage ?? 0,
        lecciones_completadas: body.leccionesCompletadas ?? body.completedLessons ?? 0,
        ultima_leccion_id: body.ultimaLeccionId ?? body.lastLessonId ?? null,
        actualizado_en: now
      }, { onConflict: 'id_usuario,id_clase' })
      .select()
      .single();

    if (error) {
      return errorResponse('Error al actualizar progreso: ' + error.message, 500);
    }

    return jsonResponse({
      idClase: data.id_clase,
      progresoPorcentaje: data.progreso_porcentaje,
      leccionesCompletadas: data.lecciones_completadas,
      ultimaLeccionId: data.ultima_leccion_id,
      actualizadoEn: data.actualizado_en
    });
  } catch (err) {
    console.error('Class progress error:', err);
    return errorResponse('Error interno del servidor', 500);
  }
}
