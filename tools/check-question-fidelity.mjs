import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [practiceHandler, api, simulator, questionMedia] = await Promise.all([
  read('supabase/functions/api/handlers/practica.ts'),
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

const optionContent = questionMedia.match(/export function OptionContent[\s\S]*$/)?.[0] ?? '';
assert.doesNotMatch(optionContent, /\.trim\(\)/);
assert.match(optionContent, /\{text\}/);
assert.match(optionContent, /whitespace-pre-wrap/);

console.log('question fidelity checks passed');
