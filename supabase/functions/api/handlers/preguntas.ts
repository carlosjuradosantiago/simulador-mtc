// handlers/preguntas.ts - VERSIÓN CORREGIDA CON AUTH UNIFICADO
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getUserFromToken } from '../_shared/auth.ts';

const EXAM_ACCESS_LIMITS_ENABLED = false;
const LEGACY_EXAM_LIMIT = 3;
// Headers CORS para todas las respuestas
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-auth-token',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE'
};

// Cliente de Supabase con service role key (reutilizable)
let _supabaseAdmin: ReturnType<typeof createClient> | null = null;
function getAdminClient() {
  if (!_supabaseAdmin) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  }
  return _supabaseAdmin;
}

/**
 * Verifica el token de Supabase usando el cliente oficial
 * Este método es compatible con los tokens generados por Supabase Auth
 */ async function getUserFromSupabaseToken(req: Request) {
  try {
    // Obtener el token del header X-Auth-Token
    const token = req.headers.get('X-Auth-Token');
    if (!token) {
      console.log('❌ No se encontró el header X-Auth-Token');
      return null;
    }
    console.log('✅ Token encontrado en X-Auth-Token (primeros 50 chars):', token.substring(0, 50) + '...');
    // Crear cliente de Supabase con las credenciales del Edge Function
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}` // Usar el token del usuario
        }
      }
    });
    // Verificar el token usando el método oficial de Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) {
      console.error('❌ Error verificando token:', error.message);
      return null;
    }
    if (!user) {
      console.log('❌ Usuario no encontrado con el token proporcionado');
      return null;
    }
    console.log('✅ Usuario autenticado exitosamente:', {
      userId: user.id,
      email: user.email
    });
    return {
      userId: user.id,
      email: user.email || 'email-no-disponible'
    };
  } catch (error) {
    console.error('❌ Excepción al verificar token:', error);
    return null;
  }
}

/**
 * Respuesta de éxito con CORS y JSON
 */
function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Handler para iniciar un examen cronometrado
 * NOTA: Los errores 500 se lanzan como excepciones para que withLogging
 * los capture automáticamente con error_message y error_stack en edge_function_logs.
 */ export async function handleExamenCronometrado(req: Request, examTypeId: string, categoryId: string) {
  // Convertir los parámetros a números
  const examTypeIdNum = parseInt(examTypeId, 10);
  const categoryIdNum = parseInt(categoryId, 10);
  
  console.log('\n🎯 ========== INICIO handleExamenCronometrado ==========');
  console.log('📋 Parámetros recibidos:', {
    examTypeId: examTypeIdNum,
    categoryId: categoryIdNum
  });

  // ============ PASO 1: AUTENTICACIÓN ============
  console.log('\n🔐 PASO 1: Verificando autenticación...');
  const userAuth = await getUserFromToken(req);
  if (!userAuth) {
    console.log('❌ Usuario no autenticado');
    return jsonResponse({
      type: 'UltraSimple',
      message: 'Por favor inicia sesión para acceder al examen.'
    }, 401);
  }
  console.log('✅ Usuario autenticado:', userAuth.userId, userAuth.sub);

  // Cliente admin reutilizable para todas las consultas DB
  const supabase = getAdminClient();

  // ============ PASO 2: OBTENER ID DE USUARIO ============
  console.log('\n🔍 PASO 2: Verificando usuario en la base de datos...');
  const userId = userAuth.userId;
  if (!userId) {
    console.error('❌ No se pudo obtener el ID del usuario desde el token');
    return jsonResponse({
      type: 'UltraSimple',
      message: 'Usuario no registrado en el sistema. Por favor completa tu registro.'
    }, 404);
  }
  console.log('✅ Usuario ID:', userId);

  // ============ PASO 3: VERIFICAR INTENTOS Y MEMBRESÍA ============
  console.log('\n📊 PASO 3: Registrando intentos del usuario...');
  // Contar sesiones de práctica del usuario (sesion_practica es la tabla que se llena al iniciar cada examen)
  const { count: attemptCount, error: attemptError } = await supabase
    .from('sesion_practica')
    .select('*', { count: 'exact', head: true })
    .eq('id_usuario', userId)
    .eq('estado', 'FINALIZADO');
  if (attemptError) {
    throw new Error(`[PASO 3] Error al contar sesiones del usuario ${userId}: ${attemptError.message} (code: ${attemptError.code}, details: ${attemptError.details})`);
  }
  const totalAttempts = attemptCount || 0;
  console.log(`📝 Sesiones completadas: ${totalAttempts}`);

  let hasActiveMembership = false;
  if (EXAM_ACCESS_LIMITS_ENABLED) {
    // Verificar membresía activa solo cuando se reactiven los límites de acceso.
    const { data: activeMembership, error: membershipError } = await supabase
      .from('membresias_usuario')
      .select('*')
      .eq('id_usuario', userId)
      .eq('esta_activa', true)
      .gte('fecha_fin', new Date().toISOString())
      .maybeSingle();
    if (membershipError) {
      console.error('❌ Error al verificar membresía:', membershipError.message);
      // No lanzar error aquí - la membresía es opcional
    }
    hasActiveMembership = !!activeMembership;
    console.log(`💳 Membresía activa: ${hasActiveMembership}`);
  }

  // ============ PASO 4: VALIDAR ACCESO ============
  console.log('\n✅ PASO 4: Validando acceso...');
  if (!EXAM_ACCESS_LIMITS_ENABLED) {
    console.log('✅ Acceso permitido: límites de acceso desactivados temporalmente');
  } else if (totalAttempts < LEGACY_EXAM_LIMIT) {
    console.log(`✅ Acceso permitido: intento ${totalAttempts + 1}/${LEGACY_EXAM_LIMIT}`);
  } else if (hasActiveMembership) {
    console.log('✅ Acceso permitido: Usuario con membresía activa');
  } else {
    console.log('❌ Acceso denegado: límite de intentos alcanzado sin membresía');
    return jsonResponse({
      type: 'UltraSimple',
      message: 'No pudimos iniciar el simulacro en este momento.'
    }, 401);
  }

  // ============ PASO 5: OBTENER PREGUNTAS ============
  console.log('\n📚 PASO 5: Obteniendo preguntas del examen...');
  
  // 5a: Obtener IDs de preguntas de la categoría
  const { data: categoriaPreguntas, error: categoriaPreguntaError } = await supabase
    .from('categoria_pregunta')
    .select('id_pregunta')
    .eq('id_categoria', categoryIdNum);
  if (categoriaPreguntaError) {
    throw new Error(`[PASO 5a] Error obteniendo relación pregunta-categoría para categoría ${categoryIdNum}: ${categoriaPreguntaError.message} (code: ${categoriaPreguntaError.code})`);
  }
  if (!categoriaPreguntas || categoriaPreguntas.length === 0) {
    console.log('⚠️ No se encontraron preguntas para esta categoría');
    return jsonResponse({
      type: 'UltraSimple',
      message: 'No hay preguntas disponibles para este examen.'
    }, 404);
  }
  const allPreguntaIds = categoriaPreguntas.map((cp: { id_pregunta: number }) => cp.id_pregunta);
  console.log(`✅ Se encontraron ${allPreguntaIds.length} IDs de preguntas para la categoría`);
  
  // 5b: Seleccionar 40 preguntas con distribución inteligente por tipo (general/específica)
  const EXAM_QUESTION_LIMIT = 40;
  const GENERAL_QUESTIONS = 20;
  const SPECIFIC_QUESTIONS = 20;
  
  // Obtener información de temas de todas las preguntas candidatas
  const { data: preguntasConTema, error: temaError } = await supabase
    .from('pregunta')
    .select('id, tema')
    .in('id', allPreguntaIds);
  
  if (temaError) {
    console.warn('⚠️ Error obteniendo temas, usando selección aleatoria simple:', temaError.message);
    const shuffledIds = [...allPreguntaIds].sort(() => Math.random() - 0.5);
    var preguntaIds = shuffledIds.slice(0, Math.min(EXAM_QUESTION_LIMIT, shuffledIds.length));
  } else {
    console.log(`📊 Clasificando preguntas por tipo (general/específica)...`);
    
    // Clasificar preguntas según su tema
    const preguntasGenerales: number[] = [];
    const preguntasEspecificas: number[] = [];
    const temasPorTipo = {
      generales: new Map<string, number[]>(),
      especificas: new Map<string, number[]>()
    };
    
    for (const p of preguntasConTema) {
      const tema = p.tema || '';
      const esGeneral = tema.toLowerCase().includes('materias generales');
      
      if (esGeneral) {
        preguntasGenerales.push(p.id);
        if (!temasPorTipo.generales.has(tema)) {
          temasPorTipo.generales.set(tema, []);
        }
        temasPorTipo.generales.get(tema)!.push(p.id);
      } else {
        preguntasEspecificas.push(p.id);
        if (!temasPorTipo.especificas.has(tema)) {
          temasPorTipo.especificas.set(tema, []);
        }
        temasPorTipo.especificas.get(tema)!.push(p.id);
      }
    }
    
    console.log(`📚 Distribución encontrada:`);
    console.log(`   • Generales: ${preguntasGenerales.length} preguntas (${temasPorTipo.generales.size} temas)`);
    console.log(`   • Específicas: ${preguntasEspecificas.length} preguntas (${temasPorTipo.especificas.size} temas)`);
    
    // Función auxiliar para distribuir preguntas proporcionalmente entre temas
    const distribuirPorTemas = (temaMap: Map<string, number[]>, targetCount: number): number[] => {
      const resultado: number[] = [];
      const temas = Array.from(temaMap.entries());
      
      if (temas.length === 0) return [];
      if (temas.length === 1) {
        // Solo hay 1 tema, tomar todas las que se pueda
        const todasIds = temas[0][1];
        const shuffled = [...todasIds].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(targetCount, shuffled.length));
      }
      
      // Múltiples temas: distribuir proporcionalmente
      const totalDisponible = temas.reduce((sum, [_, ids]) => sum + ids.length, 0);
      
      for (const [tema, ids] of temas) {
        const proporcion = ids.length / totalDisponible;
        const cantidadParaEsteTema = Math.max(1, Math.round(targetCount * proporcion));
        const shuffled = [...ids].sort(() => Math.random() - 0.5);
        const seleccionadas = shuffled.slice(0, Math.min(cantidadParaEsteTema, shuffled.length));
        resultado.push(...seleccionadas);
        
        console.log(`     - ${tema.substring(0, 50)}...: ${seleccionadas.length}/${ids.length} preguntas`);
      }
      
      // Si nos pasamos o faltaron, ajustar
      if (resultado.length > targetCount) {
        return resultado.slice(0, targetCount);
      } else if (resultado.length < targetCount) {
        // Intentar completar con preguntas restantes
        const usados = new Set(resultado);
        const restantes = temas.flatMap(([_, ids]) => ids).filter(id => !usados.has(id));
        const shuffled = [...restantes].sort(() => Math.random() - 0.5);
        resultado.push(...shuffled.slice(0, targetCount - resultado.length));
      }
      
      return resultado;
    };
    
    // Decidir estrategia de selección
    if (preguntasGenerales.length > 0 && preguntasEspecificas.length > 0) {
      // Caso A-IIA: tiene ambos tipos → 20-20
      console.log(`🎯 Estrategia: 20 generales + 20 específicas`);
      
      const generalesSeleccionadas = distribuirPorTemas(temasPorTipo.generales, GENERAL_QUESTIONS);
      console.log(`   ✅ Generales seleccionadas: ${generalesSeleccionadas.length}`);
      
      const especificasSeleccionadas = distribuirPorTemas(temasPorTipo.especificas, SPECIFIC_QUESTIONS);
      console.log(`   ✅ Específicas seleccionadas: ${especificasSeleccionadas.length}`);
      
      preguntaIds = [...generalesSeleccionadas, ...especificasSeleccionadas];
    } else if (preguntasGenerales.length > 0) {
      // Solo generales
      console.log(`🎯 Estrategia: Solo preguntas generales`);
      preguntaIds = distribuirPorTemas(temasPorTipo.generales, EXAM_QUESTION_LIMIT);
    } else if (preguntasEspecificas.length > 0) {
      // Solo específicas
      console.log(`🎯 Estrategia: Solo preguntas específicas`);
      preguntaIds = distribuirPorTemas(temasPorTipo.especificas, EXAM_QUESTION_LIMIT);
    } else {
      // Fallback: selección aleatoria
      console.log(`⚠️ No se pudo clasificar por tipo, usando selección aleatoria`);
      const shuffledIds = [...allPreguntaIds].sort(() => Math.random() - 0.5);
      preguntaIds = shuffledIds.slice(0, Math.min(EXAM_QUESTION_LIMIT, shuffledIds.length));
    }
  }
  
  console.log(`✅ Seleccionadas ${preguntaIds.length} preguntas de ${allPreguntaIds.length} disponibles`);
  
  // 5c: Obtener preguntas CON opciones pero SIN datos multimedia pesados
  const { data: questions, error: questionsError } = await supabase
    .from('pregunta')
    .select(`
      id,
      texto,
      id_tipo_examen,
      tipo_pregunta,
      dificultad,
      tema,
      numero_pdf,
      tipo_seccion,
      clase,
      fundamento,
      explicacion,
      opcion_pregunta (
        id,
        texto,
        es_correcta,
        orden,
        tipo_multimedia,
        datos_multimedia
      ),
      multimedia_pregunta (
        id,
        tipo_multimedia,
        datos,
        orden,
        descripcion
      )
    `)
    .in('id', preguntaIds)
    .eq('id_tipo_examen', examTypeIdNum)
    .order('id', { ascending: true });

  if (questionsError) {
    throw new Error(`[PASO 5c] Error obteniendo preguntas (IDs: ${preguntaIds.slice(0, 5).join(',')}..., tipo_examen: ${examTypeIdNum}): ${questionsError.message} (code: ${questionsError.code}, hint: ${questionsError.hint})`);
  }
  if (!questions || questions.length === 0) {
    console.log('⚠️ No se encontraron preguntas para esta categoría y tipo de examen');
    return jsonResponse({
      type: 'UltraSimple',
      message: 'No hay preguntas disponibles para este examen.'
    }, 404);
  }
  console.log(`✅ Se encontraron ${questions.length} preguntas`);
  
  // ============ PASO 6: TRANSFORMAR PREGUNTAS AL FORMATO ESPERADO ============
  console.log('\n🔄 PASO 6: Transformando preguntas al formato del frontend...');
  const preguntasTransformadas = questions.map((q: any) => ({
    id: q.id,
    texto: q.texto,
    tema: q.tema || 'General',
    numeroPdf: q.numero_pdf || null,
    tipoSeccion: q.tipo_seccion || null,
    clase: q.clase || null,
    fundamento: q.fundamento || '',
    opciones: (q.opcion_pregunta || []).map((op: any) => ({
      id: op.id,
      texto: op.texto,
      isCorrect: op.es_correcta,
      mediaType: op.tipo_multimedia || 'Text',
      mediaData: op.datos_multimedia || null
    })),
    explicacion: q.explicacion || '',
    mediaId: q.multimedia_pregunta?.[0]?.id || null,
    hasMedia: (q.multimedia_pregunta || []).length > 0,
    imagenBase64: q.multimedia_pregunta?.[0]?.datos || null
  }));
  
  console.log(`✅ ${preguntasTransformadas.length} preguntas transformadas`);
  
  // ============ PASO 7: CREAR SESIÓN DE PRÁCTICA ============
  console.log('\n💾 PASO 7: Creando sesión de práctica...');
  const { data: practiceSession, error: sessionError } = await supabase
    .from('sesion_practica')
    .insert({
      id_usuario: userId,
      id_categoria: categoryIdNum,
      id_tipo_examen: examTypeIdNum,
      hora_inicio: new Date().toISOString(),
      modo_practica: 'CRONOMETRADO',
      tipo_sesion: 'CRONOMETRADO',
      estado: 'COMENZADO',
      total_preguntas: preguntasTransformadas.length,
      preguntas_respondidas: 0,
      respuestas_correctas: 0,
      respuestas_incorrectas: 0,
      sin_responder: preguntasTransformadas.length,
      ids_preguntas: preguntaIds,
      respuestas_detalle: [],
      preguntas_marcadas: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();
  if (sessionError || !practiceSession) {
    throw new Error(`[PASO 7] Error creando sesión de práctica (usuario: ${userId}, categoría: ${categoryIdNum}, tipo_examen: ${examTypeIdNum}): ${sessionError?.message || 'practiceSession es null'} (code: ${sessionError?.code}, details: ${sessionError?.details})`);
  }
  console.log('✅ Sesión de práctica creada:', practiceSession.id);

  // ============ PASO 8: RESPUESTA EXITOSA ============
  console.log('\n🎉 PASO 8: Enviando respuesta exitosa...');
  console.log('✅ ========== FIN handleExamenCronometrado ==========\n');
  
  return jsonResponse({
    id: practiceSession.id,
    examTypeId: examTypeIdNum,
    categoryId: categoryIdNum,
    practiceMode: practiceSession.modo_practica || 'PRACTICA',
    status: practiceSession.estado || 'COMENZADO',
    startTime: practiceSession.hora_inicio,
    endTime: practiceSession.hora_fin || null,
    totalQuestions: preguntasTransformadas.length,
    answeredQuestions: 0,
    correctAnswers: 0,
    precisionPercentage: 0,
    currentQuestionIndex: 0,
    preguntas: preguntasTransformadas
  });
}
