import { getSupabaseClient } from '../_shared/supabase.ts';
import { getUserFromToken } from '../_shared/auth.ts';
import { jsonResponse, errorResponse, unauthorizedResponse } from '../_shared/response.ts';
import { normalizeSessionQuestionIds } from '../_shared/exam-submission.ts';

export async function handleGuardarRespuesta(req: Request, sessionId: string) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return unauthorizedResponse();
    }

    const body = await req.json();
    const questionId = Number(body.id_pregunta);
    const selectedOptionId = Number(body.id_opcion_seleccionada);

    if (
      !Number.isInteger(questionId)
      || questionId <= 0
      || !Number.isInteger(selectedOptionId)
      || selectedOptionId <= 0
    ) {
      return errorResponse('Faltan datos: id_pregunta e id_opcion_seleccionada son requeridos', 400);
    }

    const sesionId = parseInt(sessionId);
    const supabase = getSupabaseClient();

    const { data: session } = await supabase
      .from('sesion_practica')
      .select('*')
      .eq('id', sesionId)
      .single();

    if (!session || session.id_usuario !== user.userId) {
      return errorResponse('Sesión no encontrada o no autorizada', 403);
    }

    if (session.estado === 'FINALIZADO') {
      return errorResponse('La sesión ya fue finalizada', 409);
    }

    if (!normalizeSessionQuestionIds(session.ids_preguntas).includes(questionId)) {
      return errorResponse('La pregunta no pertenece a esta sesión', 400);
    }

    const { data: opcion } = await supabase
      .from('opcion_pregunta')
      .select('id, texto, es_correcta')
      .eq('id', selectedOptionId)
      .eq('id_pregunta', questionId)
      .single();

    if (!opcion) {
      return errorResponse('Opción no encontrada para la pregunta indicada', 404);
    }

    const respuestasDetalle = Array.isArray(session.respuestas_detalle)
      ? session.respuestas_detalle
      : [];

    const now = new Date().toISOString();
    const updatedAnswer = {
      id_pregunta: questionId,
      id_opcion_seleccionada: selectedOptionId,
      opcion_texto: opcion.texto,
      es_correcta: opcion.es_correcta,
      respondido_en: now
    };

    const nextDetalle = [
      ...respuestasDetalle.filter((respuesta: any) => Number(respuesta.id_pregunta) !== questionId),
      updatedAnswer
    ];

    const totalRespondidas = nextDetalle.length;
    const totalCorrectas = nextDetalle.filter((respuesta: any) => respuesta.es_correcta).length;
    const totalIncorrectas = totalRespondidas - totalCorrectas;
    const porcentaje = totalRespondidas > 0 ? Number(((totalCorrectas / totalRespondidas) * 100).toFixed(2)) : 0;

    const { error: updateError } = await supabase
      .from('sesion_practica')
      .update({
        respuestas_detalle: nextDetalle,
        preguntas_respondidas: totalRespondidas,
        respuestas_correctas: totalCorrectas,
        respuestas_incorrectas: totalIncorrectas,
        porcentaje_precision: porcentaje,
        porcentaje,
        actualizado_en: now,
        updated_at: now
      })
      .eq('id', sesionId);

    if (updateError) {
      console.error('Error updating session answer:', updateError);
      return errorResponse('Error al guardar respuesta', 500);
    }

    const [correctOptionResult, questionResult] = await Promise.all([
      supabase
        .from('opcion_pregunta')
        .select('id, texto')
        .eq('id_pregunta', questionId)
        .eq('es_correcta', true)
        .maybeSingle(),
      supabase
        .from('pregunta')
        .select('explicacion, fundamento')
        .eq('id', questionId)
        .maybeSingle()
    ]);
    const opcionCorrecta = correctOptionResult.data;
    const pregunta = questionResult.data;

    if (correctOptionResult.error || !opcionCorrecta || questionResult.error || !pregunta) {
      console.error('Error loading answer feedback:', correctOptionResult.error || questionResult.error);
      return errorResponse('La respuesta se guardó, pero no pudimos cargar su explicación. Vuelve a intentarlo.', 500);
    }


    return jsonResponse({
      success: true,
      esCorrecta: opcion.es_correcta,
      es_correcta: opcion.es_correcta,
      opcionSeleccionada: {
        id: opcion.id,
        texto: opcion.texto
      },
      opcionCorrecta: opcionCorrecta ? {
        id: opcionCorrecta.id,
        texto: opcionCorrecta.texto
      } : null,
      explicacion: pregunta?.explicacion || pregunta?.fundamento || null,
      total_respondidas: totalRespondidas,
      total_correctas: totalCorrectas,
      total_incorrectas: totalIncorrectas,
      porcentaje_precision: porcentaje
    });
  } catch (err) {
    console.error('Error saving answer:', err);
    return errorResponse('Error interno del servidor', 500);
  }
}
