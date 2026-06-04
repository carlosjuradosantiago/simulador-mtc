import { getSupabaseClient } from '../_shared/supabase.ts';
import { jsonResponse, errorResponse, unauthorizedResponse } from '../_shared/response.ts';

function checkImportToken(req: Request) {
  const expected = Deno.env.get('MTC_IMPORT_TOKEN')?.trim();
  if (!expected) {
    return { ok: false, response: errorResponse('Importador MTC deshabilitado', 410) };
  }

  const provided = req.headers.get('x-mtc-import-token')?.trim();
  if (!provided || provided !== expected) {
    return { ok: false, response: unauthorizedResponse() };
  }

  return { ok: true, response: null };
}

function requireObject(value: unknown, label: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} debe ser un objeto`);
  }
  return value as Record<string, any>;
}

function chunk<T>(items: T[], size: number) {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

function cleanQuestionRow(row: Record<string, any>) {
  return {
    id_tipo_examen: row.id_tipo_examen,
    texto: row.texto,
    tipo_pregunta: row.tipo_pregunta,
    dificultad: row.dificultad,
    tema: row.tema,
    tipo_seccion: row.tipo_seccion ?? null,
    clase: row.clase ?? null,
    numero_pdf: row.numero_pdf ?? null,
    fundamento: row.fundamento ?? null,
    explicacion: row.explicacion ?? null,
  };
}

function cleanOptionRow(row: Record<string, any>, questionId: number) {
  return {
    id_pregunta: questionId,
    texto: row.texto ?? '',
    es_correcta: Boolean(row.es_correcta),
    orden: row.orden ?? null,
    tipo_multimedia: row.tipo_multimedia ?? null,
    datos_multimedia: row.datos_multimedia ?? null,
  };
}

function cleanQuestionMediaRow(row: Record<string, any>, questionId: number) {
  return {
    id_pregunta: questionId,
    tipo_multimedia: row.tipo_multimedia,
    datos: row.datos,
    orden: row.orden ?? null,
    descripcion: row.descripcion ?? null,
  };
}

export async function handleMtcImportQuestions(req: Request) {
  const auth = checkImportToken(req);
  if (!auth.ok) return auth.response;

  try {
    const body = requireObject(await req.json(), 'body');
    const items = Array.isArray(body.questions) ? body.questions : [];
    if (items.length < 1 || items.length > 20) {
      return errorResponse('questions debe contener entre 1 y 20 elementos', 400);
    }

    const supabase = getSupabaseClient();
    const imported: Array<{ importIndex: number; id: number }> = [];

    for (const item of items) {
      const payload = requireObject(item, 'question import item');
      const importIndex = Number(payload.importIndex);
      if (!Number.isInteger(importIndex) || importIndex < 1) {
        return errorResponse('importIndex invalido', 400);
      }

      const question = cleanQuestionRow(requireObject(payload.question, 'question'));
      if (!question.texto || !question.id_tipo_examen || !question.tipo_pregunta) {
        return errorResponse(`Pregunta ${importIndex} incompleta`, 400);
      }

      const { data: insertedQuestion, error: questionError } = await supabase
        .from('pregunta')
        .insert(question)
        .select('id')
        .single();

      if (questionError || !insertedQuestion) {
        return errorResponse(`Error insertando pregunta ${importIndex}: ${questionError?.message ?? 'sin detalle'}`, 500);
      }

      const questionId = Number(insertedQuestion.id);
      const options = Array.isArray(payload.options) ? payload.options : [];
      const optionRows = options.map((option: any) => cleanOptionRow(requireObject(option, 'option'), questionId));

      for (const batch of chunk(optionRows, 100)) {
        const { error: optionError } = await supabase.from('opcion_pregunta').insert(batch);
        if (optionError) {
          return errorResponse(`Error insertando opciones de pregunta ${importIndex}: ${optionError.message}`, 500);
        }
      }

      const questionMedia = Array.isArray(payload.questionMedia) ? payload.questionMedia : [];
      const mediaRows = questionMedia.map((media: any) => cleanQuestionMediaRow(requireObject(media, 'question media'), questionId));

      for (const batch of chunk(mediaRows, 50)) {
        const { error: mediaError } = await supabase.from('multimedia_pregunta').insert(batch);
        if (mediaError) {
          return errorResponse(`Error insertando multimedia de pregunta ${importIndex}: ${mediaError.message}`, 500);
        }
      }

      imported.push({ importIndex, id: questionId });
    }

    return jsonResponse({ imported });
  } catch (err) {
    console.error('MTC import questions error:', err);
    return errorResponse(String(err), 500);
  }
}

export async function handleMtcImportFinalize(req: Request) {
  const auth = checkImportToken(req);
  if (!auth.ok) return auth.response;

  try {
    const body = requireObject(await req.json(), 'body');
    const categories = Array.isArray(body.categories)
      ? body.categories.map((value: any) => Number(value)).filter((value: number) => Number.isInteger(value))
      : [];
    const rawRelations = Array.isArray(body.relations) ? body.relations : [];

    if (!categories.length) {
      return errorResponse('categories es requerido', 400);
    }

    const relationsByCategory = new Map<number, Set<number>>();
    for (const relation of rawRelations) {
      const row = requireObject(relation, 'relation');
      const categoryId = Number(row.id_categoria);
      const questionId = Number(row.id_pregunta);
      if (!Number.isInteger(categoryId) || !Number.isInteger(questionId) || !categories.includes(categoryId)) {
        continue;
      }
      if (!relationsByCategory.has(categoryId)) {
        relationsByCategory.set(categoryId, new Set());
      }
      relationsByCategory.get(categoryId)!.add(questionId);
    }

    const supabase = getSupabaseClient();
    const summary: Array<{ categoryId: number; relations: number }> = [];

    for (const categoryId of categories) {
      const questionIds = Array.from(relationsByCategory.get(categoryId) ?? []);
      if (!questionIds.length) {
        return errorResponse(`Categoria ${categoryId} no tiene relaciones nuevas`, 400);
      }

      for (const batch of chunk(questionIds, 300)) {
        const { error: deleteExistingError } = await supabase
          .from('categoria_pregunta')
          .delete()
          .eq('id_categoria', categoryId)
          .in('id_pregunta', batch);

        if (deleteExistingError) {
          return errorResponse(`Error limpiando relaciones nuevas de categoria ${categoryId}: ${deleteExistingError.message}`, 500);
        }
      }

      const relationRows = questionIds.map((questionId) => ({
        id_categoria: categoryId,
        id_pregunta: questionId,
      }));

      for (const batch of chunk(relationRows, 500)) {
        const { error: insertError } = await supabase.from('categoria_pregunta').insert(batch);
        if (insertError) {
          return errorResponse(`Error insertando relaciones de categoria ${categoryId}: ${insertError.message}`, 500);
        }
      }

      const idList = `(${questionIds.join(',')})`;
      const { error: deleteOldError } = await supabase
        .from('categoria_pregunta')
        .delete()
        .eq('id_categoria', categoryId)
        .not('id_pregunta', 'in', idList);

      if (deleteOldError) {
        return errorResponse(`Error reemplazando relaciones antiguas de categoria ${categoryId}: ${deleteOldError.message}`, 500);
      }

      summary.push({ categoryId, relations: questionIds.length });
    }

    return jsonResponse({ ok: true, summary });
  } catch (err) {
    console.error('MTC import finalize error:', err);
    return errorResponse(String(err), 500);
  }
}

export async function handleMtcImportUpdateQuestions(req: Request) {
  const auth = checkImportToken(req);
  if (!auth.ok) return auth.response;

  try {
    const body = requireObject(await req.json(), 'body');
    const items = Array.isArray(body.questions) ? body.questions : [];
    if (items.length < 1 || items.length > 50) {
      return errorResponse('questions debe contener entre 1 y 50 elementos', 400);
    }

    const supabase = getSupabaseClient();
    let updatedQuestions = 0;
    let updatedOptions = 0;

    for (const item of items) {
      const payload = requireObject(item, 'question update item');
      const questionId = Number(payload.id);
      if (!Number.isInteger(questionId) || questionId < 1) {
        return errorResponse('id de pregunta invalido', 400);
      }

      if (payload.question) {
        const question = cleanQuestionRow(requireObject(payload.question, 'question'));
        const { error: questionError } = await supabase
          .from('pregunta')
          .update(question)
          .eq('id', questionId);

        if (questionError) {
          return errorResponse(`Error actualizando pregunta ${questionId}: ${questionError.message}`, 500);
        }
        updatedQuestions += 1;
      }

      const options = Array.isArray(payload.options) ? payload.options : [];
      for (const option of options) {
        const row = requireObject(option, 'option');
        const order = Number(row.orden);
        if (!Number.isInteger(order)) {
          return errorResponse(`Opcion de pregunta ${questionId} sin orden valido`, 400);
        }

        const updateRow = {
          texto: row.texto ?? '',
          es_correcta: Boolean(row.es_correcta),
          tipo_multimedia: row.tipo_multimedia ?? null,
          datos_multimedia: row.datos_multimedia ?? null,
        };

        const { error: optionError } = await supabase
          .from('opcion_pregunta')
          .update(updateRow)
          .eq('id_pregunta', questionId)
          .eq('orden', order);

        if (optionError) {
          return errorResponse(`Error actualizando opcion ${order} de pregunta ${questionId}: ${optionError.message}`, 500);
        }
        updatedOptions += 1;
      }
    }

    return jsonResponse({ ok: true, updatedQuestions, updatedOptions });
  } catch (err) {
    console.error('MTC import update error:', err);
    return errorResponse(String(err), 500);
  }
}
