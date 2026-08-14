import { getSupabaseClient } from '../_shared/supabase.ts';
import { jsonResponse, errorResponse } from '../_shared/response.ts';

const learningTopicKeywords: Record<string, string[]> = {
  semaforos: ['semáforo', 'semaforo', 'luz roja', 'luz verde', 'luz ámbar', 'luz ambar', 'ámbar', 'ambar', 'intermitente', 'flecha roja', 'flecha verde'],
  senales: ['señal', 'senal', 'reglamentaria', 'preventiva', 'informativa', 'r-', 'p-', 'pare', 'ceda el paso', 'curva', 'prohibido voltear'],
  prioridad: ['preferencia', 'intersección', 'interseccion', 'cruce', 'vía férrea', 'via ferrea', 'línea férrea', 'linea ferrea', 'peatón', 'peaton', 'derecha del otro', 'ceder el paso'],
  maniobras: ['adelant', 'giro', 'girar', 'voltear', 'vuelta en u', 'carril', 'estacion', 'parada', 'direccional', 'maniobra', 'retroceso'],
  velocidad: ['velocidad', 'distancia', 'frenado', 'reducir la velocidad', 'conducción preventiva', 'conduccion preventiva', 'manejo defensivo'],
  documentos: ['licencia', 'categoría', 'categoria', 'clase a', 'clase b', 'soat', 'tarjeta', 'documento', 'dni', 'constancia', 'certificado', 'inspección técnica', 'inspeccion tecnica', 'revisión técnica', 'revision tecnica'],
  infracciones: ['infracción', 'infraccion', 'sanción', 'sancion', 'multa', 'puntos', 'suspensión', 'suspension', 'retención', 'retencion', 'internamiento', 'papeleta'],
  seguridad: ['accidente', 'auxilio', 'emergencia', 'herido', 'víctima', 'victima', 'ambulancia', 'alcohol', 'droga', 'cinturón', 'cinturon', 'casco', 'escolar'],
  vehiculo: ['freno', 'neumático', 'neumatico', 'llanta', 'espejo', 'placa', 'motor', 'escape', 'parachoques', 'retroreflect', 'odómetro', 'odometro', 'velocímetro', 'velocimetro'],
  transporte: ['transporte', 'pasajeros', 'mercancías', 'mercancias', 'servicio público', 'servicio publico', 'taxi', 'afocat', 'municipalidad', 'vehículos menores', 'vehiculos menores', 'l5'],
  'reglas-generales': ['reglamento', 'tránsito', 'transito', 'conductor', 'conducción', 'conduccion', 'vía pública', 'via publica', 'norma', 'circulación', 'circulacion'],
};

function escapeFilterValue(value: string) {
  return value.replace(/[%*,()]/g, '');
}

function buildTextSearchFilter(keywords: string[]) {
  const fields = ['texto', 'tema', 'fundamento', 'explicacion'];
  return keywords
    .map(escapeFilterValue)
    .filter(Boolean)
    .flatMap((keyword) => fields.map((field) => `${field}.ilike.%${keyword}%`))
    .join(',');
}

async function getQuestionIdsForCategories(supabase: any, categoryIds: number[]) {
  const pageSize = 1000;
  let offset = 0;
  const ids: number[] = [];

  while (true) {
    const { data, error } = await supabase
      .from('categoria_pregunta')
      .select('id_pregunta')
      .in('id_categoria', categoryIds)
      .range(offset, offset + pageSize - 1);

    if (error) throw error;

    ids.push(...(data || []).map((relation: any) => relation.id_pregunta));
    if (!data || data.length < pageSize) break;
    offset += pageSize;
  }

  return [...new Set(ids)];
}

export async function handleGetQuestionBank(req: Request) {
  try {
    const url = new URL(req.url);
    const tipoExamenId = parseInt(url.searchParams.get('tipoExamenId') || '2');
    const categoriaId = url.searchParams.get('categoriaId');
    const page = Math.max(parseInt(url.searchParams.get('page') || '0'), 0);
    const size = Math.min(Math.max(parseInt(url.searchParams.get('size') || '20'), 1), 100);
    const search = url.searchParams.get('q')?.trim();
    const learningTopic = url.searchParams.get('learningTopic')?.trim();
    const tipoSeccion = url.searchParams.get('tipoSeccion')?.trim();
    const direction = url.searchParams.get('direction') === 'desc' ? 'desc' : 'asc';
    const sortColumns: Record<string, string> = {
      id: 'id',
      numeroPdf: 'numero_pdf',
      tema: 'tema',
      dificultad: 'dificultad',
    };
    const sort = Object.hasOwn(sortColumns, url.searchParams.get('sort') || '')
      ? String(url.searchParams.get('sort'))
      : 'numeroPdf';
    const offset = page * size;

    const supabase = getSupabaseClient();
    let questionIds: number[] | null = null;

    if (categoriaId) {
      try {
        questionIds = await getQuestionIdsForCategories(supabase, [parseInt(categoriaId)]);
      } catch (relationsError) {
        return errorResponse('Error al obtener preguntas de la categoria: ' + relationsError.message, 500);
      }
    } else {
      const { data: categories, error: categoriesError } = await supabase
        .from('categoria')
        .select('id')
        .eq('id_tipo_examen', tipoExamenId)
        .eq('estado', 1)
        .is('id_padre', null);

      if (categoriesError) {
        return errorResponse('Error al obtener categorias activas: ' + categoriesError.message, 500);
      }

      const categoryIds = (categories || []).map((category: any) => category.id);
      if (categoryIds.length === 0) {
        return jsonResponse({ content: [], totalElements: 0, totalPages: 0, number: page, size });
      }

      try {
        questionIds = await getQuestionIdsForCategories(supabase, categoryIds);
      } catch (relationsError) {
        return errorResponse('Error al obtener preguntas oficiales: ' + relationsError.message, 500);
      }
    }

    if (!questionIds?.length) {
      return jsonResponse({ content: [], totalElements: 0, totalPages: 0, number: page, size });
    }

    let query = supabase
      .from('pregunta')
      .select(`
        id,
        texto,
        explicacion,
        tema,
        dificultad,
        numero_pdf,
        tipo_seccion,
        clase,
        fundamento,
        opcion_pregunta(id, texto, es_correcta, orden, tipo_multimedia, datos_multimedia),
        multimedia_pregunta(id, tipo_multimedia, datos, orden, descripcion)
      `, { count: 'exact' })
      .eq('id_tipo_examen', tipoExamenId)
      .in('id', questionIds)
      .order(sortColumns[sort], { ascending: direction === 'asc', nullsFirst: false })
      .order('id', { ascending: true })
      .range(offset, offset + size - 1);

    if (search) {
      const searchFilter = buildTextSearchFilter([search]);
      if (searchFilter) query = query.or(searchFilter);
    }
    if (learningTopic && learningTopicKeywords[learningTopic]) {
      const topicFilter = buildTextSearchFilter(learningTopicKeywords[learningTopic]);
      if (topicFilter) query = query.or(topicFilter);
    }
    if (tipoSeccion && tipoSeccion !== 'Todas') {
      query = query.eq('tipo_seccion', tipoSeccion);
    }

    const { data, error, count } = await query;
    if (error) {
      return errorResponse('Error al obtener banco de preguntas: ' + error.message, 500);
    }

    const content = (data || []).map((pregunta: any) => ({
      id: pregunta.id,
      texto: pregunta.texto,
      explicacion: pregunta.explicacion,
      tema: pregunta.tema,
      dificultad: pregunta.dificultad,
      numeroPdf: pregunta.numero_pdf,
      tipoSeccion: pregunta.tipo_seccion,
      clase: pregunta.clase,
      fundamento: pregunta.fundamento,
      opciones: [...(pregunta.opcion_pregunta || [])]
        .sort((a: any, b: any) => Number(a.orden ?? 0) - Number(b.orden ?? 0))
        .map((opcion: any) => ({
          id: opcion.id,
          texto: opcion.texto,
          esCorrecta: opcion.es_correcta,
          orden: opcion.orden,
          mediaType: opcion.tipo_multimedia || 'Text',
          mediaData: opcion.datos_multimedia || null,
        })),
      multimedia: [...(pregunta.multimedia_pregunta || [])]
        .sort((a: any, b: any) => Number(a.orden ?? 0) - Number(b.orden ?? 0)),
      mediaId: pregunta.multimedia_pregunta?.[0]?.id || null,
      hasMedia: (pregunta.multimedia_pregunta || []).length > 0,
      imagenBase64: pregunta.multimedia_pregunta?.[0]?.datos || null,
    }));

    return jsonResponse({
      content,
      totalElements: count || 0,
      totalPages: Math.ceil((count || 0) / size),
      number: page,
      size,
      sort: { field: sort, direction },
    });
  } catch (err) {
    console.error('Question bank error:', err);
    return errorResponse('Error interno del servidor', 500);
  }
}
