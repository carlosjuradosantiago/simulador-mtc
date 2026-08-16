import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/pages/SimulatorPage.jsx', import.meta.url), 'utf8');
const hookSource = await readFile(new URL('../src/hooks/useExam.js', import.meta.url), 'utf8');

assert.doesNotMatch(source, /speechSynthesis|SpeechSynthesisUtterance|Escuchar pregunta/);
assert.doesNotMatch(source, /Navega y corrige tus respuestas/);
assert.match(source, /aria-expanded=\{navigatorOpen\}/);
assert.match(source, /id="question-navigator"/);
assert.match(source, /absolute right-0 top-full/);
assert.match(source, /setNavigatorOpen\(false\)/);
assert.match(source, /goToQuestion\(index\)/);
assert.match(source, /grid-cols-8/);
assert.match(source, /const isRevealed = isAnswered && Boolean\(currentFeedback\)/);
assert.match(source, /const canContinue = isRevealed \|\| hasAnswer\(pendingAnswer\)/);
assert.match(source, /setPendingAnswers\(\(current\) => \(\{ \.\.\.current, \[currentQuestion\.id\]: optionId \}\)\)/);
assert.match(source, /disabled=\{isRevealed \|\| savingAnswer\}/);
assert.match(source, /'Confirmar respuesta'/);
assert.doesNotMatch(source, /instantFeedbackPractice/);
assert.match(source, /<strong>Marcaste:<\/strong>/);
assert.match(source, /<strong>Respuesta correcta:<\/strong>/);
assert.match(source, />Explicación<\/p>/);
assert.match(source, /El cronómetro sigue avanzando\./);
assert.doesNotMatch(hookSource, /timedSession \|\| !sessionId/);
assert.match(hookSource, /api\.savePracticeAnswer\(sessionId, questionId, optionId\)/);
assert.ok(
  hookSource.indexOf('setAnswers((currentAnswers)')
    > hookSource.indexOf('await api.savePracticeAnswer(sessionId, questionId, optionId)'),
  'The answer must count only after the API confirms it.',
);

console.log('Simulator navigation and live feedback checks passed.');
