import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const sourcePath = path.resolve('data', 'mtc_extracted', 'questions_deduped.json');
const outputPath = path.resolve('tools', 'seo-category-question-bank.json');
const questionsPerCategory = 40;

const categories = [
  { slug: 'a1', code: 'A-I', categoryId: 25 },
  { slug: 'a2a', code: 'A-IIA', categoryId: 16 },
  { slug: 'a2b', code: 'A-IIB', categoryId: 17 },
  { slug: 'a3a', code: 'A-IIIA', categoryId: 18 },
  { slug: 'a3b', code: 'A-IIIB', categoryId: 19 },
  { slug: 'a3c', code: 'A-IIIC', categoryId: 20 },
  { slug: 'b2a', code: 'B-IIA', categoryId: 22 },
  { slug: 'b2b', code: 'B-IIB', categoryId: 23 },
  { slug: 'b2c', code: 'B-IIC', categoryId: 24 },
];

const topics = [
  ['reglamento-transito', 'Reglamento de tránsito y señales'],
  ['obligaciones-conductor', 'Obligaciones del conductor'],
  ['regulacion-transporte', 'Regulación del transporte'],
  ['reglamento-vehiculos', 'Reglamento Nacional de Vehículos'],
  ['mercancias-peligrosas', 'Mercancías peligrosas'],
  ['licencias-conducir', 'Sistema de licencias de conducir'],
  ['conduccion-eficiente', 'Conducción eficiente'],
  ['mecanica-conduccion', 'Mecánica para la conducción'],
  ['inspeccion-tecnica', 'Inspección técnica vehicular'],
  ['soat', 'SOAT y responsabilidad civil'],
  ['placa-unica', 'Placa Única Nacional de Rodaje'],
  ['primeros-auxilios', 'Primeros auxilios'],
];
const topicNames = new Map(topics);

function normalize(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function topicSlugFor(question) {
  const theme = normalize(question.tema);
  if (theme.includes('mercancias peligrosas')) return 'mercancias-peligrosas';
  if (theme.includes('regulacion de actividad de transporte')) return 'regulacion-transporte';
  if (theme.includes('sistema nacional de emision de licencias')) return 'licencias-conducir';
  if (theme.includes('obligaciones del conductor')) return 'obligaciones-conductor';
  if (theme.includes('reglamento de transito y manual')) return 'reglamento-transito';
  if (theme.includes('inspeccion tecnica vehicular')) return 'inspeccion-tecnica';
  if (theme.includes('responsabilidad civil')) return 'soat';
  if (theme.includes('placa unica')) return 'placa-unica';
  if (theme.includes('primeros auxilios')) return 'primeros-auxilios';
  if (theme.includes('conduccion eficiente')) return 'conduccion-eficiente';
  if (theme.includes('mecanica')) return 'mecanica-conduccion';
  if (theme.includes('vehicul')) return 'reglamento-vehiculos';
  throw new Error(`Tema sin clasificar: ${question.tema}`);
}

function hasMedia(question) {
  return Boolean(question.question_media?.length || question.options.some((option) => option.media?.length));
}

function isCompleteTextQuestion(question) {
  if (!question.text?.trim() || question.options?.length !== 4) return false;
  if (question.options.some((option) => !option.text?.trim())) return false;
  const correctOptions = question.options.filter((option) => option.is_correct);
  return correctOptions.length === 1 && correctOptions[0].label === question.answer;
}

function stableRank(categorySlug, questionId) {
  return createHash('sha256').update(`${categorySlug}:${questionId}`).digest('hex');
}

function serializeQuestion({ question, source }) {
  const orderedOptions = [...question.options].sort((left, right) => left.order - right.order);
  const correctOptions = orderedOptions.filter((option) => option.is_correct);
  assert.equal(correctOptions.length, 1, `${source.source_code} #${source.numero_pdf}: debe existir una respuesta correcta`);
  assert.equal(correctOptions[0].label, question.answer, `${source.source_code} #${source.numero_pdf}: la clave no coincide`);
  assert(source.numero_pdf, `${source.source_code}: falta el número de pregunta del PDF`);

  const topicSlug = topicSlugFor(question);
  return {
    id: question.canonical_key,
    sourceCode: source.source_code,
    number: source.numero_pdf,
    sourcePage: source.page,
    topicSlug,
    topicName: topicNames.get(topicSlug),
    text: question.text,
    options: orderedOptions.map((option) => option.text),
    correctAnswer: correctOptions[0].text,
    fundamento: question.fundamento || '',
  };
}

function selectBalancedQuestions(eligibleQuestions, category) {
  const grouped = new Map(topics.map(([slug]) => [slug, []]));
  for (const entry of eligibleQuestions) grouped.get(topicSlugFor(entry.question)).push(entry);
  for (const entries of grouped.values()) {
    entries.sort((left, right) => stableRank(category.slug, left.question.canonical_key)
      .localeCompare(stableRank(category.slug, right.question.canonical_key)));
  }

  const selected = [];
  while (selected.length < questionsPerCategory) {
    let foundQuestion = false;
    for (const [topicSlug] of topics) {
      const entry = grouped.get(topicSlug).shift();
      if (!entry) continue;
      selected.push(entry);
      foundQuestion = true;
      if (selected.length === questionsPerCategory) break;
    }
    if (!foundQuestion) break;
  }

  assert.equal(selected.length, questionsPerCategory, `${category.code}: no hay 40 preguntas completas sin imágenes`);
  return selected.sort((left, right) => left.source.sequence_in_source - right.source.sequence_in_source);
}

async function verifyStoredBank() {
  const bank = JSON.parse(await readFile(outputPath, 'utf8'));
  assert.match(bank.meta?.sourceSha256 || '', /^[a-f0-9]{64}$/, 'El banco SEO no conserva el hash SHA-256 de su fuente');
  assert.equal(bank.meta?.questionsPerCategory, questionsPerCategory, 'Cantidad configurada de preguntas inesperada');
  assert.equal(bank.categories?.length, categories.length, 'Cantidad de categorías inesperada');

  for (const expectedCategory of categories) {
    const category = bank.categories.find((item) => item.slug === expectedCategory.slug);
    assert(category, `Falta la categoría ${expectedCategory.slug}`);
    assert.equal(category.code, expectedCategory.code, `${expectedCategory.slug}: código inesperado`);
    assert.equal(category.categoryId, expectedCategory.categoryId, `${expectedCategory.slug}: id inesperado`);
    assert.equal(category.questions?.length, questionsPerCategory, `${expectedCategory.slug}: deben existir 40 preguntas`);
    assert.equal(new Set(category.questions.map((question) => question.id)).size, questionsPerCategory, `${expectedCategory.slug}: hay preguntas duplicadas`);
    for (const question of category.questions) {
      assert.equal(question.options?.length, 4, `${question.id}: deben existir cuatro alternativas`);
      assert(question.options.includes(question.correctAnswer), `${question.id}: la respuesta no coincide con una alternativa`);
      assert(question.sourceCode && question.number && question.sourcePage, `${question.id}: falta trazabilidad al balotario`);
    }
  }
}

async function buildBank() {
  const sourceText = await readFile(sourcePath, 'utf8');
  const questions = JSON.parse(sourceText);
  const categoryBanks = categories.map((category) => {
    const sourceQuestions = questions.filter((question) => question.category_ids.includes(category.categoryId));
    const eligibleQuestions = sourceQuestions
      .filter((question) => !hasMedia(question) && isCompleteTextQuestion(question))
      .map((question) => ({
        question,
        source: question.sources.find((source) => source.source_category_id === category.categoryId),
      }))
      .filter((entry) => entry.source);
    const selectedQuestions = selectBalancedQuestions(eligibleQuestions, category).map(serializeQuestion);
    assert.equal(new Set(selectedQuestions.map((question) => question.id)).size, questionsPerCategory, `${category.code}: preguntas duplicadas`);

    return {
      ...category,
      sourceQuestionCount: sourceQuestions.length,
      eligibleQuestionCount: eligibleQuestions.length,
      questions: selectedQuestions,
    };
  });

  return `${JSON.stringify({
    meta: {
      sourceFile: 'data/mtc_extracted/questions_deduped.json',
      sourceSha256: createHash('sha256').update(sourceText).digest('hex'),
      sourceQuestionCount: questions.length,
      questionsPerCategory,
      selectionPolicy: 'Selección determinista equilibrada por tema, con cuatro alternativas, clave válida y sin dependencia de imágenes.',
    },
    categories: categoryBanks,
  }, null, 2)}\n`;
}

async function main() {
  const checkOnly = process.argv.includes('--check');
  let expected;
  try {
    expected = await buildBank();
  } catch (error) {
    if (!checkOnly || error.code !== 'ENOENT') throw error;
    await verifyStoredBank();
    console.log('Banco SEO por categoría verificado internamente; la fuente deduplicada local no está disponible.');
    return;
  }

  if (checkOnly) {
    assert.equal(await readFile(outputPath, 'utf8'), expected, 'El banco SEO por categoría no coincide con la fuente deduplicada');
    console.log('Banco SEO por categoría verificado: 9 licencias y 360 preguntas.');
  } else {
    await writeFile(outputPath, expected, 'utf8');
    console.log(`Banco SEO por categoría generado en ${outputPath}.`);
  }
}

await main();
