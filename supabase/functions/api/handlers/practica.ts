import { getSupabaseClient } from '../_shared/supabase.ts';
import { getUserFromToken } from '../_shared/auth.ts';
import { jsonResponse, errorResponse, unauthorizedResponse } from '../_shared/response.ts';
import { selectPracticeQuestionIds, shuffled as shuffleItems, type PracticeSelectionMode } from '../_shared/practice-selection.ts';
import {
  FREE_FULL_EXAM_ATTEMPTS,
  getFullPracticeAccess,
  TIMED_SESSION_TYPE,
} from '../_shared/membership-access.ts';

// Get category base - determines which questions to fetch
async function getCategoriaBase(supabase, idCategoria) {
  // Get the category
  const { data: categoria } = await supabase.from('categoria').select('id, nombre').eq('id', idCategoria).single();
  if (!categoria) return [
    idCategoria
  ];
  // Check if it's a special category (BASE A or BASE B)
  const nombreLower = categoria.nombre?.toLowerCase() || '';
  if (nombreLower.includes('base a')) {
    // Get all A categories
    const { data: categorias } = await supabase.from('categoria').select('id').like('nombre', '%A-%');
    return [
      idCategoria,
      ...categorias?.map((c)=>c.id) || []
    ];
  }
  if (nombreLower.includes('base b')) {
    // Get all B categories
    const { data: categorias } = await supabase.from('categoria').select('id').like('nombre', '%B-%');
    return [
      idCategoria,
      ...categorias?.map((c)=>c.id) || []
    ];
  }
  return [
    idCategoria
  ];
}
export async function handleIniciarPractica(req, idTipoExamen, idCategoria) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return unauthorizedResponse();
    }

    const supabase = getSupabaseClient();
    const usuarioId = user.userId;
    console.log('Database user ID:', usuarioId);

    const requestBody = (!idTipoExamen || !idCategoria) ? await req.clone().json().catch(()=>({})) : {};
    const tipoExamenId = parseInt(idTipoExamen || requestBody.tipoExamenId || requestBody.idTipoExamen);
    const categoriaId = parseInt(idCategoria || requestBody.categoriaId || requestBody.idCategoria);
    const cantidadSolicitada = Number(requestBody.cantidadPreguntas ?? requestBody.questionCount ?? 40);
    const cantidadPreguntas = Math.min(Math.max(Number.isFinite(cantidadSolicitada) ? Math.trunc(cantidadSolicitada) : 40, 5), 40);
    const requestedMode = String(requestBody.modoSeleccion || '');
    const modoSeleccion: PracticeSelectionMode = requestedMode === 'weak' || requestedMode === 'adaptive'
      ? requestedMode
      : 'random';
    if (!tipoExamenId || !categoriaId) {
      return errorResponse('tipoExamenId y categoriaId son requeridos', 400);
    }

    if (cantidadPreguntas === 40) {
      const access = await getFullPracticeAccess(supabase, usuarioId, Deno.env.get('FULL_EXAM_FREE_ACCESS'));
      if (!access.allowed) {
        return jsonResponse({
          code: 'MEMBERSHIP_REQUIRED',
          message: `Ya utilizaste tus ${FREE_FULL_EXAM_ATTEMPTS} prácticas completas gratuitas. Suscríbete por 1 mes para continuar.`,
          checkoutPath: `/checkout?category=${categoriaId}`,
          freeAttemptsUsed: access.completedAttempts,
          freeAttemptLimit: FREE_FULL_EXAM_ATTEMPTS,
        }, 402);
      }
    }

    // Get category base IDs
    const categoriaIds = await getCategoriaBase(supabase, categoriaId);

    const { data: todasLasPreguntas, error: qError } = await supabase
      .from('categoria_pregunta')
      .select('id_pregunta')
      .in('id_categoria', categoriaIds);
    
    if (qError) {
      console.error('Error fetching question IDs:', qError);
      return errorResponse('Error al obtener preguntas', 500);
    }
    const todosLosIds = [...new Set((todasLasPreguntas || []).map(q => q.id_pregunta))];

    const { data: intentosPrevios } = modoSeleccion !== 'random'
      ? await supabase
        .from('intento')
        .select('id, created_at, respuestas_detalle')
        .eq('id_usuario', usuarioId)
        .eq('id_categoria', categoriaId)
        .order('created_at', { ascending: false })
        // ponytail: 250 recent attempts bound payload size; move mastery to a summary table if users exceed this window.
        .limit(250)
      : { data: [] };
    const respuestasPrevias = (intentosPrevios || []).flatMap((intento) => (
      Array.isArray(intento.respuestas_detalle)
        ? intento.respuestas_detalle.map((respuesta) => ({
          ...respuesta,
          attemptId: intento.id,
          attemptedAt: intento.created_at,
        }))
        : []
    ));
    const selection = selectPracticeQuestionIds(
      todosLosIds,
      respuestasPrevias,
      cantidadPreguntas,
      modoSeleccion,
    );
    const shuffled = selection.ids;

    console.log('Selección de práctica:', {
      solicitado: modoSeleccion,
      aplicado: selection.appliedMode,
      falladasDisponibles: selection.failedAvailable,
      composicion: selection.composition,
      total: shuffled.length,
    });
    if (shuffled.length === 0) {
      if (modoSeleccion === 'weak') {
        return jsonResponse({
          code: 'NO_FAILED_QUESTIONS',
          message: 'Todavía no tienes preguntas falladas en esta categoría. Practica preguntas aleatorias y vuelve cuando tengas errores por repasar.',
        }, 409);
      }
      return errorResponse('No hay preguntas disponibles para esta categoría', 404);
    }
    // Get questions with options
    const { data: preguntas, error: pError } = await supabase.from('pregunta').select(`
        id,
        texto,
        explicacion,
        opcion_pregunta(id, texto, es_correcta, orden, tipo_multimedia, datos_multimedia),
        multimedia_pregunta(id, tipo_multimedia, datos, orden, descripcion)
      `).in('id', shuffled);
    if (pError) {
      console.error('Error fetching questions:', pError);
      return errorResponse('Error al obtener preguntas', 500);
    }
    const tipoSesion = modoSeleccion === 'adaptive'
      ? 'PRACTICA_ADAPTATIVA'
      : cantidadPreguntas < 40
        ? 'PRACTICA_CORTA'
        : 'PRACTICA';
    // Create practice session
    const { data: session, error: sError } = await supabase.from('sesion_practica').insert({
      id_usuario: usuarioId, // Use numeric user ID from usuarios table
      id_tipo_examen: tipoExamenId,
      id_categoria: categoriaId,
      modo_practica: modoSeleccion === 'adaptive' ? 'ADAPTATIVA' : 'PRACTICA',
      estado: 'COMENZADO',
      total_preguntas: shuffled.length,
      preguntas_respondidas: 0,
      respuestas_correctas: 0,
      respuestas_incorrectas: 0,
      ids_preguntas: shuffled,
      tipo_sesion: tipoSesion,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).select().single();
    if (sError) {
      console.error('Error creating session:', sError);
      return errorResponse('Error al crear sesión de práctica', 500);
    }
    // Format response
    const ordenPregunta = new Map(shuffled.map((id, index)=>[id, index]));
    const preguntasDto = (preguntas || []).sort((left, right)=>(ordenPregunta.get(left.id) ?? 0) - (ordenPregunta.get(right.id) ?? 0)).map((p)=>({
        id: p.id,
        texto: p.texto,
        explicacion: p.explicacion,
        opciones: shuffleItems(p.opcion_pregunta || []).map((o, optionIndex)=>({
            id: o.id,
            texto: o.texto,
            esCorrecta: o.es_correcta,
            orden: optionIndex + 1,
            mediaType: o.tipo_multimedia || 'Text',
            mediaData: o.datos_multimedia || null
          })),
        multimedia: (p.multimedia_pregunta || []).map((m)=>({
            id: m.id,
            tipoMultimedia: m.tipo_multimedia,
            datos: m.datos,
            orden: m.orden,
            descripcion: m.descripcion,
            url: `/api/practica/media/${m.id}`
          })),
        mediaId: p.multimedia_pregunta?.[0]?.id || null,
        hasMedia: (p.multimedia_pregunta || []).length > 0,
        imagenBase64: p.multimedia_pregunta?.[0]?.datos || null
      }));
    return jsonResponse({
      practiceSessionId: session.id,
      tipoSesion,
      estado: 'EN_PROGRESO',
      totalPreguntas: shuffled.length,
      preguntasRespondidas: 0,
      respuestasCorrectas: 0,
      respuestasIncorrectas: 0,
      modoSeleccion,
      modoSeleccionAplicado: selection.appliedMode,
      preguntasFalladasDisponibles: selection.failedAvailable,
      preguntasFalladasEnEspera: selection.deferredFailures,
      preguntasDominadas: selection.retiredFailures,
      preguntasVistas: selection.seenQuestions,
      composicion: selection.composition,
      preguntas: preguntasDto
    });
  } catch (err) {
    console.error('Iniciar practica error:', err);
    return errorResponse('Error interno del servidor', 500);
  }
}
export async function handleGetEstadoPractica(req, practiceSessionId) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return unauthorizedResponse();
    }
    const supabase = getSupabaseClient();
    const sessionId = parseInt(practiceSessionId);
    // Get session
    const { data: session, error } = await supabase.from('sesion_practica').select('*').eq('id', sessionId).single();
    if (error || !session) {
      return errorResponse('Sesión no encontrada', 404);
    }
    // Verify ownership
    if (session.id_usuario !== user.userId) {
      return unauthorizedResponse();
    }
    // If finished, return basic info
    if (session.estado === 'FINALIZADO') {
      return jsonResponse({
        practiceSessionId: session.id,
        tipoSesion: session.tipo_sesion,
        estado: session.estado,
        totalPreguntas: session.total_preguntas,
        preguntasRespondidas: session.preguntas_respondidas,
        respuestasCorrectas: session.respuestas_correctas,
        respuestasIncorrectas: session.respuestas_incorrectas,
        tiempoTotal: session.tiempo_total,
        preguntas: []
      });
    }
    // Get questions
    const preguntaIds = session.ids_preguntas || [];
    const { data: preguntas } = await supabase.from('pregunta').select(`
        id,
        texto,
        explicacion,
        opcion_pregunta(id, texto, es_correcta, orden, tipo_multimedia, datos_multimedia),
        multimedia_pregunta(id, tipo_multimedia, datos, orden, descripcion)
      `).in('id', preguntaIds);
    const includeAnswerDetails = session.tipo_sesion !== TIMED_SESSION_TYPE;
    const preguntasDto = (preguntas || []).map((p)=>({
        id: p.id,
        texto: p.texto,
        explicacion: includeAnswerDetails ? p.explicacion : undefined,
        opciones: (p.opcion_pregunta || []).map((o)=>({
            id: o.id,
            texto: o.texto,
            esCorrecta: includeAnswerDetails ? o.es_correcta : undefined,
            orden: o.orden,
            mediaType: o.tipo_multimedia || 'Text',
            mediaData: o.datos_multimedia || null
          })),
        multimedia: (p.multimedia_pregunta || []).map((m)=>({
            id: m.id,
            tipoMultimedia: m.tipo_multimedia,
            datos: m.datos,
            orden: m.orden,
            descripcion: m.descripcion,
            url: `/api/practica/media/${m.id}`
          })),
        mediaId: p.multimedia_pregunta?.[0]?.id || null,
        hasMedia: (p.multimedia_pregunta || []).length > 0,
        imagenBase64: p.multimedia_pregunta?.[0]?.datos || null
      }));
    return jsonResponse({
      practiceSessionId: session.id,
      tipoSesion: session.tipo_sesion,
      estado: session.estado,
      totalPreguntas: session.total_preguntas,
      preguntasRespondidas: session.preguntas_respondidas,
      respuestasCorrectas: session.respuestas_correctas,
      respuestasIncorrectas: session.respuestas_incorrectas,
      preguntas: preguntasDto
    });
  } catch (err) {
    console.error('Get estado practica error:', err);
    return errorResponse('Error interno del servidor', 500);
  }
}
export async function handleFinalizarPractica(req, practiceSessionIdParam = null) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return unauthorizedResponse();
    }
    const body = await req.json().catch(()=>({}));
    const practiceSessionId = parseInt(practiceSessionIdParam || body.practiceSessionId);
    const supabase = getSupabaseClient();
    // Get session
    const { data: session, error } = await supabase.from('sesion_practica').select('*').eq('id', practiceSessionId).single();
    if (error || !session) {
      return errorResponse('Sesión no encontrada', 404);
    }
    // Verify ownership
    if (session.id_usuario !== user.userId) {
      return unauthorizedResponse();
    }
    // Update session
    const now = new Date().toISOString();
    const totalPreguntas = body.totalPreguntas ?? session.total_preguntas ?? body.preguntasRespondidas ?? 0;
    const respuestasCorrectas = body.respuestasCorrectas ?? 0;
    const respuestasIncorrectas = body.respuestasIncorrectas ?? Math.max((body.preguntasRespondidas ?? totalPreguntas) - respuestasCorrectas, 0);
    const porcentajeAciertos = totalPreguntas > 0 ? Math.round(respuestasCorrectas / totalPreguntas * 100) : 0;
    const { data: updated, error: updateError } = await supabase.from('sesion_practica').update({
      estado: 'FINALIZADO',
      preguntas_respondidas: body.preguntasRespondidas ?? totalPreguntas,
      respuestas_correctas: respuestasCorrectas,
      respuestas_incorrectas: respuestasIncorrectas,
      tiempo_total: body.tiempoTotal || null,
      porcentaje: porcentajeAciertos,
      porcentaje_precision: porcentajeAciertos,
      aprobado: porcentajeAciertos >= 80,
      hora_fin: now,
      fecha_fin: now,
      actualizado_en: now,
      updated_at: now
    }).eq('id', practiceSessionId).select().single();
    if (updateError) {
      console.error('Error updating session:', updateError);
      return errorResponse('Error al finalizar sesión', 500);
    }
    return jsonResponse({
      practiceSessionId: updated.id,
      estado: 'FINALIZADO',
      totalPreguntas: updated.total_preguntas,
      preguntasRespondidas: updated.preguntas_respondidas,
      respuestasCorrectas: updated.respuestas_correctas,
      respuestasIncorrectas: updated.respuestas_incorrectas,
      tiempoTotal: updated.tiempo_total,
      porcentajeAciertos,
      mensaje: porcentajeAciertos >= 80 ? '¡Felicidades! Has aprobado.' : 'Sigue practicando para mejorar.'
    });
  } catch (err) {
    console.error('Finalizar practica error:', err);
    return errorResponse('Error interno del servidor', 500);
  }
}
export async function handleGetMedia(_req, mediaId) {
  try {
    const supabase = getSupabaseClient();
    const { data: media, error } = await supabase.from('multimedia_pregunta').select('*').eq('id', parseInt(mediaId)).single();
    if (error || !media) {
      return errorResponse('Media no encontrada', 404);
    }
    return jsonResponse({
      id: media.id,
      tipoMultimedia: media.tipo_multimedia,
      datos: media.datos,
      contenido: media.datos,
      descripcion: media.descripcion,
      orden: media.orden
    });
  } catch (err) {
    console.error('Get media error:', err);
    return errorResponse('Error interno del servidor', 500);
  }
}
