import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/pages/SimulatorPage.jsx', import.meta.url), 'utf8');

assert.doesNotMatch(source, /speechSynthesis|SpeechSynthesisUtterance|Escuchar pregunta/);
assert.doesNotMatch(source, /Navega y corrige tus respuestas/);
assert.match(source, /aria-expanded=\{navigatorOpen\}/);
assert.match(source, /id="question-navigator"/);
assert.match(source, /absolute right-0 top-full/);
assert.match(source, /setNavigatorOpen\(false\)/);
assert.match(source, /goToQuestion\(index\)/);
assert.match(source, /grid-cols-8/);

console.log('Simulator compact navigation checks passed.');
