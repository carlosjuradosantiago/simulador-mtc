import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [source, hookSource, startPanelSource, authSource, callbackSource, landingSource, resultsSource] = await Promise.all([
  readFile(new URL('../src/pages/SimulatorPage.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/hooks/useExam.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/practice/VehicleStartPanel.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/auth/AuthModal.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/pages/AuthCallbackPage.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/pages/LandingPage.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/pages/ResultsPage.jsx', import.meta.url), 'utf8'),
]);

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
assert.match(startPanelSource, /showQuickFirst = !hasPracticeHistory/);
assert.match(startPanelSource, /effectivePracticeMode = showQuickFirst \? 'random' : practiceMode/);
assert.match(startPanelSource, /setPracticeMode\('random'\);[\s\S]*?\[selectedCategoryId\]/);
assert.match(
  startPanelSource,
  /\{showQuickFirst \? \([\s\S]*?aria-label="Modo de la primera práctica"[\s\S]*?\) : \(\s*<fieldset>/,
  'A new user must start with random questions without an unavailable weak-question choice.',
);
assert.ok(
  startPanelSource.indexOf('{showQuickFirst ? quickPracticeSection : null}')
    < startPanelSource.indexOf('id="adaptive-practice-title"'),
  'A new user must see the five-question win before long practice modes.',
);
assert.match(startPanelSource, /trackFunnelEvent\('vehicle_selected'/);
assert.match(startPanelSource, /trackFunnelEvent\('practice_mode_selected'/);
assert.match(authSource, /trackAuthEvent\('auth_opened'/);
assert.match(authSource, /trackAuthEvent\('registration_completed'/);
assert.match(callbackSource, /type: 'google_auth_completed'/);
assert.doesNotMatch(callbackSource, /type: 'registration_completed'/);
assert.match(hookSource, /type: 'practice_started'/);
assert.match(hookSource, /if \(nextSessionId && nextQuestions\.length > 0\)/);
assert.match(hookSource, /questionCount: nextQuestions\.length/);
assert.match(hookSource, /sessionId: nextSessionId/);
assert.match(landingSource, /category: selectedCategoryId/);
assert.match(landingSource, /redirectTo: `\/simulacro\/\$\{selectedCategoryId\}\?mode=quick&strategy=\$\{practiceMode\}`/);
assert.match(resultsSource, /Primera meta completada/);
assert.match(resultsSource, /Continuar con entrenamiento inteligente/);

console.log('Simulator navigation, quick-win retention, and funnel analytics checks passed.');
