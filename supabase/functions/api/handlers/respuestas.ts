import { getSupabaseClient } from '../_shared/supabase.ts';
import { getUserFromToken } from '../_shared/auth.ts';
import { jsonResponse, errorResponse, unauthorizedResponse } from '../_shared/response.ts';

export async function handleGuardarRespuesta(req: Request, sessionId: string) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return unauthorizedResponse();
    }

    const body = await req.json();
    const { id_pregunta, id_opcion_seleccionada } = body;

    if (!id_pregunta || !id_opcion_seleccionada) {
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

    const { data: opcion } = await supabase
      .from('opcion_pregunta')
      .select('id, texto, es_correcta')
      .eq('id', id_opcion_seleccionada)
      .eq('id_pregunta', id_pregunta)
      .single();

    if (!opcion) {
      return errorResponse('Opción no encontrada para la pregunta indicada', 404);
    }

    const respuestasDetalle = Array.isArray(session.respuestas_detalle)
      ? session.respuestas_detalle
      : [];

    const now = new Date().toISOString();
    const updatedAnswer = {
      id_pregunta,
      id_opcion_seleccionada,
      opcion_texto: opcion.texto,
      es_correcta: opcion.es_correcta,
      respondido_en: now
    };

    const nextDetalle = [
      ...respuestasDetalle.filter((respuesta: any) => respuesta.id_pregunta !== id_pregunta),
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

    return jsonResponse({
      success: true,
      es_correcta: opcion.es_correcta,
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
