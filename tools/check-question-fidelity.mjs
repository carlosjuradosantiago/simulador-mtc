import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [practiceHandler, timedHandler, answerHandler, api, simulator, questionMedia] = await Promise.all([
  read('supabase/functions/api/handlers/practica.ts'),
  read('supabase/functions/api/handlers/preguntas.ts'),
  read('supabase/functions/api/handlers/respuestas.ts'),
  read('src/services/api.js'),
  read('src/pages/SimulatorPage.jsx'),
  read('src/components/ui/QuestionMedia.jsx'),
]);

assert.match(practiceHandler, /texto:\s*p\.texto/);
assert.match(practiceHandler, /texto:\s*o\.texto/);
assert.match(api, /texto:\s*question\.texto/);
assert.match(api, /texto:\s*option\.texto/);

const questionTitle = simulator.match(/<h1 id="question-title"[\s\S]*?<\/h1>/)?.[0] ?? '';
assert.match(questionTitle, /\{currentQuestion\.texto\}/);
assert.doesNotMatch(questionTitle, /line-clamp|truncate|max-h-|overflow-hidden|text-overflow/);
assert.match(questionTitle, /whitespace-pre-wrap/);

const timedQuestionPayload = timedHandler.match(/const preguntasTransformadas[\s\S]*?\/\/ ============ PASO 7/)?.[0] ?? '';
assert.doesNotMatch(timedQuestionPayload, /es_correcta|explicacion/);
assert.match(practiceHandler, /const includeAnswerDetails = session\.tipo_sesion !== TIMED_SESSION_TYPE;/);
assert.match(practiceHandler, /explicacion: includeAnswerDetails \? p\.explicacion : undefined/);
assert.match(practiceHandler, /esCorrecta: includeAnswerDetails \? o\.es_correcta : undefined/);
assert.match(answerHandler, /normalizeSessionQuestionIds\(session\.ids_preguntas\)\.includes\(questionId\)/);
assert.match(answerHandler, /opcionCorrecta/);
assert.match(answerHandler, /explicacion:/);
assert.match(answerHandler, /correctOptionResult\.error \|\| !opcionCorrecta \|\| questionResult\.error \|\| !pregunta/);

assert.match(simulator, /const isRevealed = isAnswered && \(quickPractice \|\| Boolean\(currentFeedback\)\);/);
assert.match(simulator, /currentFeedback\?\.opcionCorrecta\?\.id/);
assert.match(simulator, /<strong>Marcaste:<\/strong>/);
assert.match(simulator, /<strong>Respuesta correcta:<\/strong>/);
assert.match(simulator, /<p className="font-bold">Explicación<\/p>/);

const optionContent = questionMedia.match(/export function OptionContent[\s\S]*$/)?.[0] ?? '';
assert.doesNotMatch(optionContent, /\.trim\(\)/);
assert.match(optionContent, /\{text\}/);
assert.match(optionContent, /whitespace-pre-wrap/);

console.log('question fidelity checks passed');
