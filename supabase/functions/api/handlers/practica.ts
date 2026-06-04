import { getSupabaseClient } from '../_shared/supabase.ts';
import { getUserFromToken } from '../_shared/auth.ts';
import { jsonResponse, errorResponse, unauthorizedResponse } from '../_shared/response.ts';

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
    if (!tipoExamenId || !categoriaId) {
      return errorResponse('tipoExamenId y categoriaId son requeridos', 400);
    }
    // Get category base IDs
    const categoriaIds = await getCategoriaBase(supabase, categoriaId);
    
    // 🎯 PASO 1: Obtener preguntas que el usuario respondió INCORRECTAMENTE en intentos anteriores
    const { data: preguntasFalladas } = await supabase
      .from('respuesta_intento')
      .select('id_pregunta, pregunta!inner(id, categoria_pregunta!inner(id_categoria))')
      .eq('respuesta_intento.es_correcta', false)
      .in('pregunta.categoria_pregunta.id_categoria', categoriaIds)
      .order('respondido_en', { ascending: false });
    
    // Obtener IDs únicos de preguntas falladas (sin duplicados)
    const preguntasIncorrectasIds = [...new Set(
      (preguntasFalladas || []).map(r => r.id_pregunta)
    )];
    
    console.log('Preguntas falladas anteriormente:', preguntasIncorrectasIds.length);
    
    // 🎯 PASO 2: Obtener TODAS las preguntas disponibles de esta categoría
    const { data: todasLasPreguntas, error: qError } = await supabase
      .from('categoria_pregunta')
      .select('id_pregunta')
      .in('id_categoria', categoriaIds);
    
    if (qError) {
      console.error('Error fetching question IDs:', qError);
      return errorResponse('Error al obtener preguntas', 500);
    }
    
    const todosLosIds = (todasLasPreguntas || []).map(q => q.id_pregunta);
    
    // 🎯 PASO 3: Separar preguntas nuevas (nunca respondidas o respondidas correctamente)
    const preguntasNuevas = todosLosIds.filter(id => !preguntasIncorrectasIds.includes(id));
    
    // 🎯 PASO 4: Mezclar y seleccionar
    // Prioridad: primero las falladas, luego completar con nuevas
    const preguntasIncorrectasMezcladas = preguntasIncorrectasIds.sort(() => Math.random() - 0.5);
    const preguntasNuevasMezcladas = preguntasNuevas.sort(() => Math.random() - 0.5);
    
    // Combinar: hasta 40 preguntas (priorizando las falladas)
    const shuffled = [
      ...preguntasIncorrectasMezcladas.slice(0, 40),
      ...preguntasNuevasMezcladas
    ].slice(0, 40);
    
    console.log('Distribución final:', {
      falladas: Math.min(preguntasIncorrectasMezcladas.length, 40),
      nuevas: Math.max(0, 40 - preguntasIncorrectasMezcladas.length),
      total: shuffled.length
    });
    if (shuffled.length === 0) {
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
    // Create practice session
    const { data: session, error: sError } = await supabase.from('sesion_practica').insert({
      id_usuario: usuarioId, // Use numeric user ID from usuarios table
      id_tipo_examen: tipoExamenId,
      id_categoria: categoriaId,
      modo_practica: 'PRACTICA',
      estado: 'COMENZADO',
      total_preguntas: shuffled.length,
      preguntas_respondidas: 0,
      respuestas_correctas: 0,
      respuestas_incorrectas: 0,
      ids_preguntas: shuffled,
      tipo_sesion: 'PRACTICA',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).select().single();
    if (sError) {
      console.error('Error creating session:', sError);
      return errorResponse('Error al crear sesión de práctica', 500);
    }
    // Format response
    const preguntasDto = (preguntas || []).map((p)=>({
        id: p.id,
        texto: p.texto,
        explicacion: p.explicacion,
        opciones: (p.opcion_pregunta || []).map((o)=>({
            id: o.id,
            texto: o.texto,
            esCorrecta: o.es_correcta,
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
      tipoSesion: 'PRACTICA',
      estado: 'EN_PROGRESO',
      totalPreguntas: shuffled.length,
      preguntasRespondidas: 0,
      respuestasCorrectas: 0,
      respuestasIncorrectas: 0,
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
    const preguntasDto = (preguntas || []).map((p)=>({
        id: p.id,
        texto: p.texto,
        explicacion: p.explicacion,
        opciones: (p.opcion_pregunta || []).map((o)=>({
            id: o.id,
            texto: o.texto,
            esCorrecta: o.es_correcta,
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
