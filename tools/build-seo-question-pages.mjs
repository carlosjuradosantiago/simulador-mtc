import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const sourcePath = path.resolve('data', 'mtc_extracted', 'questions_deduped.json');
const outputPath = path.resolve('tools', 'seo-question-page-bank.json');
const publicMediaDir = path.resolve('public', 'seo-media');

const categories = [
  { slug: 'a1', code: 'A-I', categoryId: 25, pdf: 'balotario_A-I.pdf' },
  { slug: 'a2a', code: 'A-IIA', categoryId: 16, pdf: 'balotario_A-IIA.pdf' },
  { slug: 'a2b', code: 'A-IIB', categoryId: 17, pdf: 'balotario_A-IIB.pdf' },
  { slug: 'a3a', code: 'A-IIIA', categoryId: 18, pdf: 'balotario_A-IIIA.pdf' },
  { slug: 'a3b', code: 'A-IIIB', categoryId: 19, pdf: 'balotario_A-IIIB.pdf' },
  { slug: 'a3c', code: 'A-IIIC', categoryId: 20, pdf: 'balotario_A-IIIC.pdf' },
  { slug: 'b2a', code: 'B-IIA', categoryId: 22, pdf: 'balotario_B-IIA.pdf' },
  { slug: 'b2b', code: 'B-IIB', categoryId: 23, pdf: 'balotario_B-IIB.pdf' },
  { slug: 'b2c', code: 'B-IIC', categoryId: 24, pdf: 'balotario_B-IIC.pdf' },
];
const categoryByCode = new Map(categories.map((category) => [category.code, category]));

const manualQuestionTexts = new Set([
  'El color ámbar o amarillo del semáforo significa que:',
  '¿Qué indica una flecha verde en un semáforo vehicular?',
  'En las vías, las marcas en el pavimento que son del tipo central discontinua y de color amarillo significan que:',
  'La señal vertical reglamentaria R-6 "prohibido voltear a la izquierda", significa que:',
].map(normalizeQuestionText));

function normalizeQuestionText(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[“”"'´`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function slugify(value, maxLength = 64) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
}

function shorten(value, maxLength) {
  const text = String(value).replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  const clipped = text.slice(0, maxLength + 1).replace(/\s+\S*$/, '').replace(/[,:;.-]+$/, '');
  return `${clipped}…`;
}

function hasMedia(question) {
  return Boolean(question.question_media?.length || question.options?.some((option) => option.media?.length));
}

function topicSlugFor(question) {
  const theme = normalizeQuestionText(question.tema);
  if (theme.includes('mercancias peligrosas')) return 'preguntas-mercancias-peligrosas-mtc';
  if (theme.includes('regulacion de actividad de transporte')) return 'preguntas-regulacion-transporte-mtc';
  if (theme.includes('sistema nacional de emision de licencias')) return 'preguntas-licencias-conducir-mtc';
  if (theme.includes('obligaciones del conductor')) return 'preguntas-obligaciones-conductor-mtc';
  if (theme.includes('reglamento de transito y manual')) return 'preguntas-reglamento-transito-mtc';
  if (theme.includes('inspeccion tecnica vehicular')) return 'preguntas-inspeccion-tecnica-vehicular-mtc';
  if (theme.includes('responsabilidad civil')) return 'preguntas-soat-mtc';
  if (theme.includes('placa unica')) return 'preguntas-placa-unica-mtc';
  if (theme.includes('primeros auxilios')) return 'preguntas-primeros-auxilios-mtc';
  if (theme.includes('conduccion eficiente')) return 'preguntas-conduccion-eficiente-mtc';
  if (theme.includes('mecanica')) return 'preguntas-mecanica-conduccion-mtc';
  if (theme.includes('vehicul')) return 'preguntas-reglamento-vehiculos-mtc';
  throw new Error(`Tema sin clasificar: ${question.tema}`);
}

function isCompleteQuestion(question) {
  if (!question.text?.trim() || question.options?.length !== 4) return false;
  if (question.options.some((option) => !option.text?.trim())) return false;
  const correctOptions = question.options.filter((option) => option.is_correct);
  return correctOptions.length === 1 && correctOptions[0].label === question.answer;
}

function sourceCodesFor(group) {
  return [...new Set(group.flatMap((question) => question.sources.map((source) => source.source_code)))]
    .filter((code) => categoryByCode.has(code))
    .sort((left, right) => categories.findIndex((category) => category.code === left)
      - categories.findIndex((category) => category.code === right));
}

function groupScore(group) {
  const codes = sourceCodesFor(group);
  const text = normalizeQuestionText(group[0].text);
  return (group.some(hasMedia) ? 1000 : 0)
    + (group.some((question) => question.fundamento?.trim()) ? 400 : 0)
    + (codes.includes('A-I') ? 120 : 0)
    + codes.length * 20
    + (/senal|semaforo|interseccion|prioridad|adelant|linea|velocidad/.test(text) ? 60 : 0)
    + (text.length <= 180 ? 20 : 0);
}

function sortQuestionGroups(groups) {
  return [...groups].sort((left, right) => {
    const scoreDifference = groupScore(right) - groupScore(left);
    if (scoreDifference) return scoreDifference;
    return normalizeQuestionText(left[0].text).localeCompare(normalizeQuestionText(right[0].text), 'es');
  });
}

async function publicMedia(media, pageId, kind, index, checkOnly) {
  const sourceFile = path.resolve(media.filename);
  const extension = path.extname(sourceFile).toLowerCase() || '.png';
  const filename = `${pageId}-${kind}-${index + 1}${extension}`;
  const targetFile = path.join(publicMediaDir, filename);
  const url = `/seo-media/${filename}`;

  if (checkOnly) {
    const targetStat = await stat(targetFile).catch(() => null);
    assert(targetStat?.isFile(), `Falta la imagen SEO ${targetFile}`);
  } else {
    await copyFile(sourceFile, targetFile);
  }

  return {
    url,
    width: Number(media.width) || null,
    height: Number(media.height) || null,
    sha256: media.sha256,
  };
}

async function serializeVariant(question, pageId, variantIndex, checkOnly) {
  const orderedOptions = [...question.options].sort((left, right) => left.order - right.order);
  const correctOption = orderedOptions.find((option) => option.is_correct);
  const sources = question.sources
    .filter((source) => categoryByCode.has(source.source_code))
    .map((source) => ({
      code: source.source_code,
      number: source.numero_pdf,
      page: source.page,
      pdf: categoryByCode.get(source.source_code).pdf,
    }))
    .sort((left, right) => categories.findIndex((category) => category.code === left.code)
      - categories.findIndex((category) => category.code === right.code));

  return {
    id: question.canonical_key,
    text: question.text,
    topic: question.tema,
    categories: [...new Set(sources.map((source) => source.code))],
    sources,
    fundamento: question.fundamento || '',
    questionMedia: await Promise.all((question.question_media || []).map((media, index) => (
      publicMedia(media, pageId, `pregunta-${variantIndex + 1}`, index, checkOnly)
    ))),
    options: await Promise.all(orderedOptions.map(async (option, optionIndex) => ({
      label: String(option.label || 'abcd'[optionIndex]).toUpperCase(),
      text: option.text,
      isCorrect: option.is_correct,
      media: await Promise.all((option.media || []).map((media, mediaIndex) => (
        publicMedia(media, pageId, `opcion-${variantIndex + 1}-${optionIndex + 1}`, mediaIndex, checkOnly)
      ))),
    }))),
    correctAnswer: correctOption.text,
  };
}

async function serializePage(group, checkOnly) {
  const normalizedText = normalizeQuestionText(group[0].text);
  const id = createHash('sha256').update(normalizedText).digest('hex').slice(0, 10);
  const slugStem = slugify(group[0].text.replace(/^¿?cuál de (las|la|los|el) siguientes?\s*/i, ''), 60) || 'pregunta-examen-mtc';
  const slug = `preguntas-mtc/${slugStem}-${id}`;
  const categoriesForPage = sourceCodesFor(group);
  const variants = await Promise.all(group.map((question, index) => serializeVariant(question, id, index, checkOnly)));
  const answers = [...new Set(variants.map((variant) => variant.correctAnswer))];
  const fundamentos = [...new Set(variants.map((variant) => variant.fundamento).filter(Boolean))];
  const categoryLabel = categoriesForPage.join(', ');
  const answerSummary = answers.length === 1
    ? `La respuesta correcta es: ${answers[0]}`
    : `La respuesta presenta ${answers.length} variantes según el balotario. Revisa la alternativa correspondiente a ${categoryLabel}.`;
  const titleStem = shorten(group[0].text.replace(/[¿?:]+/g, '').trim(), 50);
  const primarySource = variants[0]?.sources[0];
  const sourceSuffix = primarySource
    ? `| ${primarySource.code} pregunta ${primarySource.number}`
    : '| Examen MTC';
  const signCodes = [...group[0].text.matchAll(/\b(?:R|P|I)-\d+(?:-\d+)?[A-Z]?\b/gi)]
    .map((match) => match[0].toUpperCase());
  const title = signCodes.length
    ? `Señal ${[...new Set(signCodes)].join(' y ')}: ${shorten(group[0].text.replace(/[¿?:]+/g, '').trim(), 28)} ${sourceSuffix}`
    : `${shorten(titleStem, 38)} ${sourceSuffix}`;

  return {
    id,
    slug,
    title,
    description: `${shorten(`Respuesta correcta, alternativas y fuente de “${group[0].text}”.`, 118)}${primarySource ? ` Balotario ${primarySource.code}, pregunta ${primarySource.number}.` : ''}`,
    h1: group[0].text,
    intro: answerSummary,
    topic: group[0].tema,
    topicSlug: topicSlugFor(group[0]),
    categories: categoriesForPage,
    categorySlugs: categoriesForPage.map((code) => categoryByCode.get(code).slug),
    variants,
    fundamentos,
    hasMedia: variants.some((variant) => variant.questionMedia.length || variant.options.some((option) => option.media.length)),
  };
}

async function buildBank(checkOnly = false) {
  const sourceText = await readFile(sourcePath, 'utf8');
  const questions = JSON.parse(sourceText).filter(isCompleteQuestion);
  const grouped = new Map();

  for (const question of questions) {
    const key = normalizeQuestionText(question.text);
    if (manualQuestionTexts.has(key)) continue;
    const group = grouped.get(key) || [];
    group.push(question);
    grouped.set(key, group);
  }

  const selected = sortQuestionGroups(grouped.values());
  await mkdir(publicMediaDir, { recursive: true });
  const pages = await Promise.all(selected.map((group) => serializePage(group, checkOnly)));
  const bank = {
    meta: {
      sourceFile: 'data/mtc_extracted/questions_deduped.json',
      sourceSha256: createHash('sha256').update(sourceText).digest('hex'),
      sourceQuestionCount: JSON.parse(sourceText).length,
      uniqueQuestionTextCount: grouped.size + manualQuestionTexts.size,
      publishedPageCount: pages.length,
      selectionPolicy: 'Todos los enunciados completos y válidos de la fuente deduplicada, agrupando únicamente las variantes del mismo texto entre categorías.',
    },
    pages,
  };
  return `${JSON.stringify(bank, null, 2)}\n`;
}

const checkOnly = process.argv.includes('--check');
const expected = await buildBank(checkOnly);
if (checkOnly) {
  assert.equal(await readFile(outputPath, 'utf8'), expected, 'El banco de páginas por pregunta no coincide con la fuente deduplicada');
  console.log(`Banco SEO por pregunta verificado: ${JSON.parse(expected).pages.length} páginas completas.`);
} else {
  await writeFile(outputPath, expected, 'utf8');
  console.log(`Banco SEO por pregunta generado: ${JSON.parse(expected).pages.length} páginas y medios públicos vinculados.`);
}
