import { getSupabaseClient } from '../_shared/supabase.ts';
import { getUserFromToken } from '../_shared/auth.ts';
import { jsonResponse, errorResponse, unauthorizedResponse } from '../_shared/response.ts';

async function getCanonicalUsuario(supabase: any, userId: number) {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return data;
}

async function getLegacyUserByEmail(supabase: any, email: string) {
  const { data } = await supabase
    .from('users')
    .select('*')
    .ilike('email', email.toLowerCase())
    .maybeSingle();

  return data;
}

async function enrichAnswerDetails(supabase: any, rawDetails: any[]) {
  const details = Array.isArray(rawDetails) ? rawDetails : [];
  const questionIds = details
    .map((detail: any) => detail.idPregunta ?? detail.id_pregunta ?? detail.questionId)
    .filter(Boolean);
  const uniqueQuestionIds = Array.from(new Set(questionIds));

  if (!uniqueQuestionIds.length) {
    return details;
  }

  const { data: preguntas } = await supabase
    .from('pregunta')
    .select('id, texto, tema, explicacion, fundamento, clase, tipo_seccion')
    .in('id', uniqueQuestionIds);
  const { data: opciones } = await supabase
    .from('opcion_pregunta')
    .select('id, id_pregunta, texto, es_correcta')
    .in('id_pregunta', uniqueQuestionIds);

  const preguntasPorId = new Map((preguntas || []).map((pregunta: any) => [String(pregunta.id), pregunta]));
  const opcionesPorId = new Map((opciones || []).map((opcion: any) => [String(opcion.id), opcion]));
  const opcionCorrectaPorPregunta = new Map(
    (opciones || [])
      .filter((opcion: any) => opcion.es_correcta)
      .map((opcion: any) => [String(opcion.id_pregunta), opcion])
  );

  return details.map((detail: any, index: number) => {
    const idPregunta = detail.idPregunta ?? detail.id_pregunta ?? detail.questionId;
    const idOpcionSeleccionada = detail.idOpcionSeleccionada ?? detail.id_opcion_seleccionada ?? detail.selectedOptionId ?? null;
    const pregunta = preguntasPorId.get(String(idPregunta));
    const opcionSeleccionada = idOpcionSeleccionada ? opcionesPorId.get(String(idOpcionSeleccionada)) : null;
    const opcionCorrecta = opcionCorrectaPorPregunta.get(String(idPregunta));
    const sinResponder = Boolean(detail.sinResponder ?? detail.sin_responder ?? !idOpcionSeleccionada);
    const esCorrecta = sinResponder
      ? false
      : Boolean(detail.esCorrecta ?? detail.es_correcta ?? opcionSeleccionada?.es_correcta ?? false);

    return {
      ...detail,
      numero: detail.numero ?? index + 1,
      idPregunta,
      idOpcionSeleccionada,
      idOpcionCorrecta: detail.idOpcionCorrecta ?? opcionCorrecta?.id ?? null,
      preguntaTexto: detail.preguntaTexto ?? pregunta?.texto ?? null,
      tema: detail.tema ?? pregunta?.tema ?? 'General',
      temaOficial: detail.temaOficial ?? detail.tema_oficial ?? pregunta?.tema ?? 'General',
      fundamento: detail.fundamento ?? pregunta?.fundamento ?? null,
      clase: detail.clase ?? pregunta?.clase ?? null,
      tipoSeccion: detail.tipoSeccion ?? detail.tipo_seccion ?? pregunta?.tipo_seccion ?? null,
      opcionSeleccionadaTexto: detail.opcionSeleccionadaTexto ?? opcionSeleccionada?.texto ?? null,
      opcionCorrectaTexto: detail.opcionCorrectaTexto ?? opcionCorrecta?.texto ?? null,
      explicacion: detail.explicacion ?? pregunta?.explicacion ?? null,
      esCorrecta,
      sinResponder
    };
  });
}

// GET /api/user/profile
export async function handleGetProfile(req) {
  try {
    const user = await getUserFromToken(req);
    console.log('User from token:', user ? JSON.stringify(user) : 'null');
    if (!user) {
      console.log('Returning unauthorized - no valid user from token');
      return unauthorizedResponse();
    }
    const supabase = getSupabaseClient();
    const userData = await getCanonicalUsuario(supabase, user.userId);
    if (!userData) {
      return errorResponse('Usuario no encontrado', 404);
    }
    return jsonResponse({
      id: userData.id,
      email: userData.correo_electronico,
      nombre: userData.primer_nombre,
      apellido: userData.apellido,
      username: userData.nombre_usuario,
      profileImageUrl: userData.url_foto_social,
      authProvider: userData.proveedor_social || 'TRADITIONAL',
      enabled: userData.habilitado ?? userData.esta_activo,
      createdAt: userData.creado_en
    });
  } catch (err) {
    console.error('Get profile error:', err);
    return errorResponse('Error interno del servidor', 500);
  }
}
// GET /api/user/exam-history
export async function handleGetExamHistory(req) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return unauthorizedResponse();
    }
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '0');
    const size = parseInt(url.searchParams.get('size') || '10');
    const offset = page * size;
    const supabase = getSupabaseClient();
    // Get total count
    const { count } = await supabase.from('intento').select('*', {
      count: 'exact',
      head: true
    }).eq('id_usuario', user.userId);
    // Get paginated attempts - with all necessary fields
    const { data: intentos, error } = await supabase.from('intento').select(`
        id,
        id_tipo_examen,
        hora_inicio,
        hora_fin,
        puntuacion,
        total_preguntas,
        respuestas_correctas,
        respuestas_incorrectas,
        porcentaje,
        aprobado,
        tipo_examen:id_tipo_examen(id, nombre, descripcion)
      `).eq('id_usuario', user.userId).order('hora_inicio', {
      ascending: false
    }).range(offset, offset + size - 1);
    if (error) {
      console.error('Error fetching history:', error);
      return errorResponse('Error al obtener historial: ' + error.message, 500);
    }
    // Transform to expected frontend structure
    const content = (intentos || []).map((i) => {
      const startTime = i.hora_inicio ? new Date(i.hora_inicio) : null;
      const endTime = i.hora_fin ? new Date(i.hora_fin) : null;
      const durationMs = startTime && endTime ? endTime.getTime() - startTime.getTime() : 0;
      const durationMinutes = Math.round(durationMs / 60000);
      const totalQuestions = i.total_preguntas || 40;
      const correctAnswers = i.respuestas_correctas || 0;
      const incorrectAnswers = i.respuestas_incorrectas || (totalQuestions - correctAnswers);
      const score = i.puntuacion || 0;
      const accuracyPercentage = i.porcentaje || (totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0);
      
      return {
        attemptId: i.id,
        examType: {
          id: i.tipo_examen?.id || i.id_tipo_examen,
          name: i.tipo_examen?.nombre || 'Examen MTC',
          description: i.tipo_examen?.descripcion || ''
        },
        startTime: i.hora_inicio,
        endTime: i.hora_fin,
        duration: `${durationMinutes} min`,
        durationFormatted: `${durationMinutes} minutos`,
        score: score,
        scoreFormatted: `${score}/${totalQuestions}`,
        totalQuestions: totalQuestions,
        correctAnswers: correctAnswers,
        incorrectAnswers: incorrectAnswers,
        unansweredQuestions: totalQuestions - correctAnswers - incorrectAnswers,
        accuracyPercentage: accuracyPercentage,
        status: i.aprobado ? 'APROBADO' : 'DESAPROBADO'
      };
    });
    return jsonResponse({
      content,
      totalElements: count || 0,
      totalPages: Math.ceil((count || 0) / size),
      number: page,
      size,
      first: page === 0,
      last: (page + 1) * size >= (count || 0)
    });
  } catch (err) {
    console.error('Get exam history error:', err);
    return errorResponse('Error interno del servidor', 500);
  }
}
// GET /api/user/exam-history/recent
export async function handleGetRecentHistory(req) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return unauthorizedResponse();
    }
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '5');
    const supabase = getSupabaseClient();
    const { data: intentos, error } = await supabase.from('intento').select(`
        id,
        puntuacion,
        hora_inicio,
        hora_fin,
        tipo_examen:id_tipo_examen(id, nombre)
      `).eq('id_usuario', user.userId).order('hora_inicio', {
      ascending: false
    }).limit(limit);
    if (error) {
      console.error('Error fetching recent history:', error.message);
      return errorResponse('Error al obtener historial reciente: ' + error.message, 500);
    }
    return jsonResponse((intentos || []).map((i)=>({
        id: i.id,
        tipoExamen: i.tipo_examen?.nombre || 'N/A',
        tipoExamenId: i.tipo_examen?.id,
        puntuacion: i.puntuacion,
        fechaInicio: i.hora_inicio,
        fechaFin: i.hora_fin
      })));
  } catch (err) {
    console.error('Get recent history error:', err);
    return errorResponse('Error interno del servidor', 500);
  }
}
// GET /api/user/exam-history/:attemptId
export async function handleGetAttemptDetail(req, attemptId) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return unauthorizedResponse();
    }
    const supabase = getSupabaseClient();
    const { data: intento, error } = await supabase.from('intento').select(`
        *,
        categoria:id_categoria(id, nombre),
        tipo_examen:id_tipo_examen(id, nombre)
      `).eq('id', attemptId).eq('id_usuario', user.userId).single();
    if (error || !intento) {
      return errorResponse('Intento no encontrado', 404);
    }
    // Parse respuestas_detalle if stored as JSON
    let respuestasDetalle = intento.respuestas_detalle;
    if (typeof respuestasDetalle === 'string') {
      try {
        respuestasDetalle = JSON.parse(respuestasDetalle);
      } catch  {
        respuestasDetalle = [];
      }
    }
    respuestasDetalle = await enrichAnswerDetails(supabase, respuestasDetalle);
    return jsonResponse({
      id: intento.id,
      tipoIntento: intento.tipo_intento,
      categoria: {
        id: intento.categoria?.id,
        nombre: intento.categoria?.nombre
      },
      tipoExamen: {
        id: intento.tipo_examen?.id,
        nombre: intento.tipo_examen?.nombre
      },
      totalPreguntas: intento.total_preguntas,
      respuestasCorrectas: intento.respuestas_correctas,
      respuestasIncorrectas: intento.respuestas_incorrectas,
      porcentaje: intento.porcentaje,
      aprobado: intento.aprobado,
      respuestasDetalle,
      fechaInicio: intento.fecha_inicio,
      fechaFin: intento.fecha_fin,
      createdAt: intento.created_at
    });
  } catch (err) {
    console.error('Get attempt detail error:', err);
    return errorResponse('Error interno del servidor', 500);
  }
}
// GET /api/user/billing-data
export async function handleGetBillingData(req) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return unauthorizedResponse();
    }
    const supabase = getSupabaseClient();
    const usuario = await getCanonicalUsuario(supabase, user.userId);
    if (!usuario) {
      return errorResponse('Usuario no encontrado', 404);
    }

    const data = await getLegacyUserByEmail(supabase, usuario.correo_electronico);

    const billingData = data ?? {};

    return jsonResponse({
      nombres: billingData.first_name || usuario.primer_nombre || '',
      apellidos: billingData.last_name || usuario.apellido || '',
      email: billingData.email || usuario.correo_electronico || '',
      tipoDocumento: billingData.document_type || 'DNI',
      numeroDocumento: billingData.document_number || '',
      telefono: billingData.phone || '',
      tipoComprobante: billingData.receipt_type || 'boleta',
      razonSocial: billingData.business_name || '',
      direccionFiscal: billingData.fiscal_address || ''
    });
  } catch (err) {
    console.error('Get billing data error:', err);
    return errorResponse('Error interno del servidor', 500);
  }
}

// PUT /api/user/billing-data
export async function handleUpdateBillingData(req) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return unauthorizedResponse();
    }

    const body = await req.json();
    const {
      tipoDocumento,
      numeroDocumento,
      nombres,
      apellidos,
      email,
      telefono,
      tipoComprobante,
      razonSocial,
      direccionFiscal
    } = body;

    const supabase = getSupabaseClient();
    const usuario = await getCanonicalUsuario(supabase, user.userId);
    if (!usuario) {
      return errorResponse('Usuario no encontrado', 404);
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    // Update billing fields
    if (tipoDocumento !== undefined) updateData.document_type = tipoDocumento;
    if (numeroDocumento !== undefined) updateData.document_number = numeroDocumento;
    if (telefono !== undefined) updateData.phone = telefono;
    if (tipoComprobante !== undefined) updateData.receipt_type = tipoComprobante;
    if (razonSocial !== undefined) updateData.business_name = razonSocial;
    if (direccionFiscal !== undefined) updateData.fiscal_address = direccionFiscal;

    // Also update name/email if provided
    if (nombres !== undefined) updateData.first_name = nombres;
    if (apellidos !== undefined) updateData.last_name = apellidos;

    const legacyUser = await getLegacyUserByEmail(supabase, usuario.correo_electronico);
    if (!legacyUser) {
      return errorResponse('Usuario de facturación no encontrado', 404);
    }

    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', legacyUser.id);

    if (error) {
      console.error('Error updating billing data:', error);
      return errorResponse('Error al actualizar datos de facturación: ' + error.message, 500);
    }

    return jsonResponse({ message: 'Datos actualizados correctamente' });
  } catch (err) {
    console.error('Update billing data error:', err);
    return errorResponse('Error interno del servidor', 500);
  }
}

// GET /api/user/stats
export async function handleGetUserStats(req) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return unauthorizedResponse();
    }
    const supabase = getSupabaseClient();
    const { data: intentos } = await supabase
      .from('intento')
      .select('puntuacion, porcentaje, aprobado')
      .eq('id_usuario', user.userId);
    if (!intentos || intentos.length === 0) {
      return jsonResponse({
        totalIntentos: 0,
        promedioGeneral: 0
      });
    }
    const promedioGeneral = Math.round(intentos.reduce((sum, i)=>sum + (Number(i.porcentaje ?? i.puntuacion) || 0), 0) / intentos.length);
    return jsonResponse({
      totalIntentos: intentos.length,
      promedioGeneral,
      intentosAprobados: intentos.filter((i)=>i.aprobado === true || Number(i.porcentaje ?? i.puntuacion) >= 80).length
    });
  } catch (err) {
    console.error('Get user stats error:', err);
    return errorResponse('Error interno del servidor', 500);
  }
}
