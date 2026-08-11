import { getSupabaseClient } from '../_shared/supabase.ts';
import { getUserFromToken } from '../_shared/auth.ts';
import { jsonResponse, errorResponse, unauthorizedResponse } from '../_shared/response.ts';
import { OFFICIAL_EXAM_QUESTION_COUNT, passesOfficialExam } from '../_shared/exam-rules.ts';
import { TIMED_SESSION_TYPE } from '../_shared/membership-access.ts';
import {
  normalizeSessionQuestionIds,
  normalizeSubmittedAnswers,
} from '../_shared/exam-submission.ts';
export async function handleSubmitExam(req) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return unauthorizedResponse();
    }
    const body = await req.json();
    const { practiceSessionId, respuestas } = body;
    if (!practiceSessionId || !respuestas || !Array.isArray(respuestas)) {
      return errorResponse('Datos de envío de examen inválidos', 400);
    }
    const supabase = getSupabaseClient();
    // Get session
    const { data: session, error: sError } = await supabase.from('sesion_practica').select('*').eq('id', practiceSessionId).eq('id_usuario', user.userId).single();
    if (sError || !session) {
      return errorResponse('Sesión de práctica no encontrada', 404);
    }
    if (session.estado === 'FINALIZADO') {
      return errorResponse('Esta sesión ya ha sido finalizada', 400);
    }
    const uniqueQuestionIds = normalizeSessionQuestionIds(session.ids_preguntas);
    if (!uniqueQuestionIds.length) {
      return errorResponse('La sesión no tiene preguntas válidas', 400);
    }
    if (
      session.tipo_sesion === TIMED_SESSION_TYPE
      && uniqueQuestionIds.length !== OFFICIAL_EXAM_QUESTION_COUNT
    ) {
      return errorResponse('El simulacro cronometrado no contiene las 40 preguntas requeridas', 409);
    }
    const normalizedSubmission = normalizeSubmittedAnswers(uniqueQuestionIds, respuestas);
    if (normalizedSubmission.outsideQuestionIds.length || normalizedSubmission.duplicateQuestionIds.length) {
      return errorResponse('Las respuestas no coinciden con las preguntas de esta sesión', 400);
    }
    const { data: preguntas } = uniqueQuestionIds.length
      ? await supabase
        .from('pregunta')
        .select('id, texto, tema, explicacion, fundamento, clase, tipo_seccion')
        .in('id', uniqueQuestionIds)
      : { data: [] };
    const { data: opciones } = uniqueQuestionIds.length
      ? await supabase
        .from('opcion_pregunta')
        .select('id, id_pregunta, texto, es_correcta')
        .in('id_pregunta', uniqueQuestionIds)
      : { data: [] };
    const preguntasPorId = new Map((preguntas || []).map((pregunta: any) => [String(pregunta.id), pregunta]));
    const opcionesPorId = new Map((opciones || []).map((opcion: any) => [String(opcion.id), opcion]));
    const opcionCorrectaPorPregunta = new Map(
      (opciones || [])
        .filter((opcion: any) => opcion.es_correcta)
        .map((opcion: any) => [String(opcion.id_pregunta), opcion])
    );

    // Process answers
    let respuestasCorrectas = 0;
    let respuestasIncorrectas = 0;
    let sinResponder = 0;
    const respuestasDetalle = [];
    for (const [index, respuesta] of normalizedSubmission.answers.entries()){
      const idPregunta = respuesta.idPregunta;
      const idOpcionSeleccionada = respuesta.idOpcionSeleccionada;
      const pregunta = preguntasPorId.get(String(idPregunta));
      const opcionSeleccionada = idOpcionSeleccionada ? opcionesPorId.get(String(idOpcionSeleccionada)) : null;
      const opcionCorrecta = opcionCorrectaPorPregunta.get(String(idPregunta));

      if (idOpcionSeleccionada && (!opcionSeleccionada || String(opcionSeleccionada.id_pregunta) !== String(idPregunta))) {
        return errorResponse('Una opción seleccionada no pertenece a su pregunta', 400);
      }

      if (!idOpcionSeleccionada) {
        sinResponder++;
        respuestasDetalle.push({
          numero: index + 1,
          idPregunta,
          idOpcionSeleccionada: null,
          idOpcionCorrecta: opcionCorrecta?.id ?? null,
          preguntaTexto: pregunta?.texto ?? null,
          tema: pregunta?.tema ?? 'General',
          temaOficial: pregunta?.tema ?? 'General',
          fundamento: pregunta?.fundamento ?? null,
          clase: pregunta?.clase ?? null,
          tipoSeccion: pregunta?.tipo_seccion ?? null,
          opcionSeleccionadaTexto: null,
          opcionCorrectaTexto: opcionCorrecta?.texto ?? null,
          explicacion: pregunta?.explicacion ?? null,
          esCorrecta: false,
          sinResponder: true,
          marcada: respuesta.marcada ?? respuesta.isMarked ?? false
        });
        continue;
      }

      if (opcionSeleccionada) {
        const esCorrecta = opcionSeleccionada.es_correcta;
        if (esCorrecta) {
          respuestasCorrectas++;
        } else {
          respuestasIncorrectas++;
        }
        respuestasDetalle.push({
          numero: index + 1,
          idPregunta,
          idOpcionSeleccionada,
          idOpcionCorrecta: opcionCorrecta?.id ?? null,
          preguntaTexto: pregunta?.texto ?? null,
          tema: pregunta?.tema ?? 'General',
          temaOficial: pregunta?.tema ?? 'General',
          fundamento: pregunta?.fundamento ?? null,
          clase: pregunta?.clase ?? null,
          tipoSeccion: pregunta?.tipo_seccion ?? null,
          opcionSeleccionadaTexto: opcionSeleccionada.texto ?? null,
          opcionCorrectaTexto: opcionCorrecta?.texto ?? null,
          explicacion: pregunta?.explicacion ?? null,
          esCorrecta,
          sinResponder: false,
          marcada: respuesta.marcada ?? respuesta.isMarked ?? false
        });
      } else {
        respuestasIncorrectas++;
        respuestasDetalle.push({
          numero: index + 1,
          idPregunta,
          idOpcionSeleccionada,
          idOpcionCorrecta: opcionCorrecta?.id ?? null,
          preguntaTexto: pregunta?.texto ?? null,
          tema: pregunta?.tema ?? 'General',
          temaOficial: pregunta?.tema ?? 'General',
          fundamento: pregunta?.fundamento ?? null,
          clase: pregunta?.clase ?? null,
          tipoSeccion: pregunta?.tipo_seccion ?? null,
          opcionSeleccionadaTexto: null,
          opcionCorrectaTexto: opcionCorrecta?.texto ?? null,
          explicacion: pregunta?.explicacion ?? null,
          esCorrecta: false,
          sinResponder: false,
          marcada: respuesta.marcada ?? respuesta.isMarked ?? false
        });
      }
    }
    const totalPreguntas = uniqueQuestionIds.length;
    const porcentaje = totalPreguntas > 0 ? Math.round(respuestasCorrectas / totalPreguntas * 100) : 0;
    const aprobado = session.tipo_sesion === TIMED_SESSION_TYPE
      ? passesOfficialExam(respuestasCorrectas)
      : porcentaje >= 80;
    const now = new Date().toISOString();
    // Update session
    const { error: updateError } = await supabase.from('sesion_practica').update({
      estado: 'FINALIZADO',
      preguntas_respondidas: totalPreguntas - sinResponder,
      respuestas_correctas: respuestasCorrectas,
      respuestas_incorrectas: respuestasIncorrectas,
      sin_responder: sinResponder,
      porcentaje,
      porcentaje_precision: porcentaje,
      aprobado,
      respuestas_detalle: respuestasDetalle,
      preguntas_marcadas: respuestasDetalle.filter((respuesta)=>respuesta.marcada).map((respuesta)=>respuesta.idPregunta),
      fecha_fin: now,
      hora_fin: now,
      actualizado_en: now,
      updated_at: now
    }).eq('id', practiceSessionId);
    if (updateError) {
      console.error('Error updating session:', updateError);
      return errorResponse('Error al actualizar sesión', 500);
    }
    // Create attempt record
    const { data: intento, error: intentoError } = await supabase.from('intento').insert({
      id_usuario: user.userId,
      id_sesion_practica: practiceSessionId,
      id_tipo_examen: session.id_tipo_examen,
      id_categoria: session.id_categoria,
      tipo_intento: session.tipo_sesion,
      total_preguntas: totalPreguntas,
      respuestas_correctas: respuestasCorrectas,
      respuestas_incorrectas: respuestasIncorrectas,
      sin_responder: sinResponder,
      porcentaje,
      puntuacion: porcentaje,
      aprobado,
      respuestas_detalle: respuestasDetalle,
      preguntas_marcadas: respuestasDetalle.filter((respuesta)=>respuesta.marcada).map((respuesta)=>respuesta.idPregunta),
      fecha_inicio: session.created_at || session.hora_inicio,
      fecha_fin: now,
      hora_inicio: session.hora_inicio || session.created_at,
      hora_fin: now,
      created_at: now
    }).select().single();
    if (intentoError) {
      console.error('Error creating attempt:', intentoError);
      return errorResponse('Error al crear intento: ' + intentoError.message, 500);
    }
    return jsonResponse({
      success: true,
      resultado: {
        intentoId: intento?.id,
        practiceSessionId,
        totalPreguntas,
        respuestasCorrectas,
        respuestasIncorrectas,
        sinResponder,
        porcentaje,
        aprobado,
        tipoSesion: session.tipo_sesion,
        respuestasDetalle,
        mensaje: aprobado ? '¡Felicidades! Has aprobado el examen.' : 'No has aprobado. Sigue practicando.'
      }
    });
  } catch (err) {
    console.error('Submit exam error:', err);
    return errorResponse('Error interno del servidor', 500);
  }
}
// Quick submit single answer for practice mode
export async function handleSubmitAnswer(req) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return unauthorizedResponse();
    }
    const body = await req.json();
    const { practiceSessionId, idPregunta, idOpcionSeleccionada } = body;
    const questionId = Number(idPregunta);
    const selectedOptionId = Number(idOpcionSeleccionada);
    if (
      !practiceSessionId
      || !Number.isInteger(questionId)
      || questionId <= 0
      || !Number.isInteger(selectedOptionId)
      || selectedOptionId <= 0
    ) {
      return errorResponse('Datos de respuesta inválidos', 400);
    }
    const supabase = getSupabaseClient();
    // Verify session
    const { data: session } = await supabase.from('sesion_practica').select('*').eq('id', practiceSessionId).eq('id_usuario', user.userId).single();
    if (!session) {
      return errorResponse('Sesión de práctica no encontrada', 404);
    }
    if (session.estado === 'FINALIZADO') {
      return errorResponse('Esta sesión ya ha sido finalizada', 400);
    }
    const sessionQuestionIds = normalizeSessionQuestionIds(session.ids_preguntas);
    if (!sessionQuestionIds.includes(questionId)) {
      return errorResponse('La pregunta no pertenece a esta sesión', 400);
    }
    // Check answer
    const { data: opcion } = await supabase
      .from('opcion_pregunta')
      .select('id, id_pregunta, es_correcta, texto')
      .eq('id', selectedOptionId)
      .eq('id_pregunta', questionId)
      .maybeSingle();
    if (!opcion) {
      return errorResponse('La opción no pertenece a esta pregunta', 400);
    }
    if (session.tipo_sesion === TIMED_SESSION_TYPE) {
      return jsonResponse({ saved: true });
    }
    const esCorrecta = opcion.es_correcta;
    // Get correct answer for feedback
    const { data: correcta } = await supabase.from('opcion_pregunta').select('id, texto').eq('id_pregunta', questionId).eq('es_correcta', true).single();
    // Update session stats
    const newRespondidas = (session.preguntas_respondidas || 0) + 1;
    const newCorrectas = (session.respuestas_correctas || 0) + (esCorrecta ? 1 : 0);
    const newIncorrectas = (session.respuestas_incorrectas || 0) + (esCorrecta ? 0 : 1);
    await supabase.from('sesion_practica').update({
      preguntas_respondidas: newRespondidas,
      respuestas_correctas: newCorrectas,
      respuestas_incorrectas: newIncorrectas,
      updated_at: new Date().toISOString()
    }).eq('id', practiceSessionId);
    // Get explanation
    const { data: pregunta } = await supabase.from('pregunta').select('explicacion').eq('id', questionId).single();
    return jsonResponse({
      esCorrecta,
      opcionSeleccionada: {
        id: opcion.id,
        texto: opcion.texto
      },
      opcionCorrecta: correcta ? {
        id: correcta.id,
        texto: correcta.texto
      } : null,
      explicacion: pregunta?.explicacion || null,
      estadoActual: {
        preguntasRespondidas: newRespondidas,
        respuestasCorrectas: newCorrectas,
        respuestasIncorrectas: newIncorrectas
      }
    });
  } catch (err) {
    console.error('Submit answer error:', err);
    return errorResponse('Error interno del servidor', 500);
  }
}
