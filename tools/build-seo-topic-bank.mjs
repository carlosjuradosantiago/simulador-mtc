import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const sourcePath = path.resolve('data', 'mtc_extracted', 'questions_deduped.json');
const outputPath = path.resolve('tools', 'seo-topic-question-bank.json');
const maxQuestionsPerTopic = 40;

const topicDefinitions = [
  {
    slug: 'preguntas-reglamento-transito-mtc',
    name: 'Reglamento de tránsito y señales',
    description: 'Preguntas completas del balotario MTC sobre reglas de tránsito, señales y dispositivos de control, con alternativas y respuestas.',
    intro: 'Repasa las reglas que ordenan la circulación, las señales y las marcas en la vía. Cada enunciado y alternativa se conserva tal como aparece en el banco extraído de los PDF oficiales.',
    keywords: ['preguntas reglas de tránsito MTC', 'señales de tránsito examen', 'balotario MTC con respuestas'],
  },
  {
    slug: 'preguntas-obligaciones-conductor-mtc',
    name: 'Obligaciones del conductor',
    description: 'Preguntas completas del examen MTC sobre obligaciones del conductor, infracciones y conducta segura, con alternativas y respuestas.',
    intro: 'Estudia las obligaciones que debe cumplir quien conduce, desde la documentación y el respeto a la autoridad hasta las conductas que previenen infracciones y accidentes.',
    keywords: ['obligaciones del conductor MTC', 'infracciones examen MTC', 'preguntas conductor con respuestas'],
  },
  {
    slug: 'preguntas-regulacion-transporte-mtc',
    name: 'Regulación del transporte',
    description: 'Preguntas del balotario MTC sobre regulación del transporte terrestre, autorizaciones, fiscalización y servicio profesional.',
    intro: 'Este bloque reúne preguntas para licencias profesionales sobre autorizaciones, fiscalización, operadores y obligaciones del servicio de transporte terrestre.',
    keywords: ['regulación transporte MTC', 'RENAT preguntas examen', 'licencia profesional balotario'],
  },
  {
    slug: 'preguntas-reglamento-vehiculos-mtc',
    name: 'Reglamento Nacional de Vehículos',
    description: 'Preguntas del balotario MTC sobre categorías, equipamiento, pesos y condiciones técnicas de los vehículos, con respuestas.',
    intro: 'Aprende a distinguir categorías vehiculares, equipamiento obligatorio, pesos, dimensiones y condiciones técnicas exigidas para circular con seguridad.',
    keywords: ['Reglamento Nacional de Vehículos preguntas', 'categorías vehiculares MTC', 'equipamiento vehicular examen'],
  },
  {
    slug: 'preguntas-mercancias-peligrosas-mtc',
    name: 'Mercancías peligrosas',
    description: 'Preguntas completas del balotario MTC sobre transporte de materiales y residuos peligrosos, contingencias y seguridad.',
    intro: 'Practica las reglas especiales para transportar materiales y residuos peligrosos, responder ante emergencias y cumplir las medidas de seguridad aplicables.',
    keywords: ['mercancías peligrosas MTC', 'materiales peligrosos examen A3C', 'preguntas transporte peligroso'],
  },
  {
    slug: 'preguntas-licencias-conducir-mtc',
    name: 'Sistema de licencias de conducir',
    description: 'Preguntas del examen MTC sobre emisión, categorías, vigencia, revalidación y restricciones de las licencias de conducir.',
    intro: 'Revisa cómo funciona el sistema de emisión de licencias, qué categoría corresponde a cada vehículo y cuáles son las reglas de vigencia y revalidación.',
    keywords: ['licencias de conducir MTC preguntas', 'categorías de licencia examen', 'revalidación brevete preguntas'],
  },
  {
    slug: 'preguntas-conduccion-eficiente-mtc',
    name: 'Conducción eficiente',
    description: 'Preguntas del balotario MTC sobre conducción eficiente, consumo de combustible y manejo responsable, con respuestas completas.',
    intro: 'Este bloque ayuda a reconocer decisiones de conducción que reducen consumo, desgaste y emisiones sin comprometer la seguridad vial.',
    keywords: ['conducción eficiente MTC', 'consumo combustible examen', 'manejo eficiente preguntas'],
  },
  {
    slug: 'preguntas-mecanica-conduccion-mtc',
    name: 'Mecánica para la conducción',
    description: 'Preguntas completas del examen MTC sobre motor, frenos, neumáticos, suspensión y mecánica para conducir con seguridad.',
    intro: 'Repasa los sistemas básicos y avanzados del vehículo que una persona conductora debe reconocer para prevenir fallas y actuar con seguridad.',
    keywords: ['mecánica examen MTC', 'preguntas mecánica vehicular', 'frenos neumáticos balotario'],
  },
  {
    slug: 'preguntas-inspeccion-tecnica-vehicular-mtc',
    name: 'Inspección técnica vehicular',
    description: 'Preguntas completas del balotario MTC sobre inspección técnica vehicular, certificados y condiciones para circular.',
    intro: 'Comprueba qué vehículos deben pasar inspección, qué acredita el certificado y qué condiciones técnicas se revisan para circular.',
    keywords: ['inspección técnica vehicular preguntas', 'CITV examen MTC', 'certificado inspección vehicular'],
  },
  {
    slug: 'preguntas-soat-mtc',
    name: 'SOAT y responsabilidad civil',
    description: 'Preguntas completas del examen MTC sobre SOAT, seguros obligatorios y responsabilidad civil en accidentes de tránsito.',
    intro: 'Estudia la cobertura obligatoria, la finalidad del SOAT y las responsabilidades relacionadas con accidentes de tránsito.',
    keywords: ['preguntas SOAT MTC', 'seguro obligatorio examen manejo', 'responsabilidad civil tránsito'],
  },
  {
    slug: 'preguntas-placa-unica-mtc',
    name: 'Placa Única Nacional de Rodaje',
    description: 'Preguntas completas del balotario MTC sobre la Placa Única Nacional de Rodaje, identificación y obligaciones del vehículo.',
    intro: 'Repasa las reglas de identificación vehicular, uso y características de la Placa Única Nacional de Rodaje.',
    keywords: ['placa única rodaje preguntas', 'placa vehicular examen MTC', 'identificación vehicular balotario'],
  },
  {
    slug: 'preguntas-primeros-auxilios-mtc',
    name: 'Primeros auxilios',
    description: 'Preguntas completas del examen MTC sobre primeros auxilios, protección de la escena y atención inicial en accidentes.',
    intro: 'Practica cómo proteger la escena, pedir ayuda y brindar una atención inicial responsable sin agravar las lesiones de una víctima.',
    keywords: ['primeros auxilios examen MTC', 'accidentes de tránsito preguntas', 'atención inicial conductor'],
  },
];

function normalize(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function topicSlugFor(question) {
  const theme = normalize(question.tema);
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

function hasMedia(question) {
  return Boolean(question.question_media?.length || question.options.some((option) => option.media?.length));
}

function isCompleteTextQuestion(question) {
  if (!question.text?.trim() || question.options?.length !== 4) return false;
  if (question.options.some((option) => !option.text?.trim())) return false;
  const correctOptions = question.options.filter((option) => option.is_correct);
  return correctOptions.length === 1 && correctOptions[0].label === question.answer;
}

function serializeQuestion(question) {
  assert.equal(question.options.length, 4, `${question.source_code} #${question.numero_pdf}: se esperaban 4 alternativas`);
  const orderedOptions = [...question.options].sort((left, right) => left.order - right.order);
  const correctOptions = orderedOptions.filter((option) => option.is_correct);
  assert.equal(correctOptions.length, 1, `${question.source_code} #${question.numero_pdf}: debe existir una respuesta correcta`);
  assert.equal(correctOptions[0].label, question.answer, `${question.source_code} #${question.numero_pdf}: la clave no coincide`);
  assert(question.text.trim(), `${question.source_code} #${question.numero_pdf}: falta el enunciado`);
  assert(orderedOptions.every((option) => option.text.trim()), `${question.source_code} #${question.numero_pdf}: falta una alternativa`);

  const balotarios = [...new Set(question.sources.map((source) => source.source_code))];
  return {
    id: question.canonical_key,
    sourceCode: question.source_code,
    number: question.numero_pdf,
    balotarios,
    text: question.text,
    options: orderedOptions.map((option) => option.text),
    correctAnswer: correctOptions[0].text,
    fundamento: question.fundamento || '',
  };
}

async function buildBank() {
  const sourceText = await readFile(sourcePath, 'utf8');
  const questions = JSON.parse(sourceText);
  const grouped = new Map(topicDefinitions.map((topic) => [topic.slug, []]));

  for (const question of questions) grouped.get(topicSlugFor(question)).push(question);

  const topics = topicDefinitions.map((definition) => {
    const sourceQuestions = grouped.get(definition.slug);
    const eligibleQuestions = sourceQuestions.filter((question) => !hasMedia(question) && isCompleteTextQuestion(question));
    const selectedQuestions = eligibleQuestions.slice(0, maxQuestionsPerTopic).map(serializeQuestion);
    assert(selectedQuestions.length >= 5, `${definition.slug}: no hay suficientes preguntas completas sin imágenes`);
    return {
      ...definition,
      sourceQuestionCount: sourceQuestions.length,
      eligibleQuestionCount: eligibleQuestions.length,
      questions: selectedQuestions,
    };
  });

  assert.equal(topics.reduce((sum, topic) => sum + topic.sourceQuestionCount, 0), questions.length, 'No se clasificaron todas las preguntas');
  const selectedIds = topics.flatMap((topic) => topic.questions.map((question) => question.id));
  assert.equal(new Set(selectedIds).size, selectedIds.length, 'Hay preguntas repetidas entre temas');

  return `${JSON.stringify({
    meta: {
      sourceFile: 'data/mtc_extracted/questions_deduped.json',
      sourceSha256: createHash('sha256').update(sourceText).digest('hex'),
      sourceQuestionCount: questions.length,
      maxQuestionsPerTopic,
      selectionPolicy: 'Solo preguntas con enunciado, cuatro alternativas, una clave válida y sin dependencia de imágenes.',
    },
    topics,
  }, null, 2)}\n`;
}

const expected = await buildBank();
if (process.argv.includes('--check')) {
  assert.equal(await readFile(outputPath, 'utf8'), expected, 'El banco temático SEO no coincide con la fuente deduplicada');
  console.log('Banco temático SEO verificado contra 655 preguntas deduplicadas.');
} else {
  await writeFile(outputPath, expected, 'utf8');
  console.log(`Banco temático SEO generado en ${outputPath}.`);
}
