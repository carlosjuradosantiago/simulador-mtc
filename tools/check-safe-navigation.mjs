import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { safeInternalPath } from '../src/utils/navigation.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const topbar = read('src/components/layout/Topbar.jsx');
const simulator = read('src/pages/SimulatorPage.jsx');

assert.equal(safeInternalPath('/dashboard'), '/dashboard');
assert.equal(safeInternalPath('/simulacro/25?mode=quick#pregunta'), '/simulacro/25?mode=quick#pregunta');
assert.equal(safeInternalPath('https://example.com'), '/dashboard');
assert.equal(safeInternalPath('//example.com'), '/dashboard');
assert.equal(safeInternalPath('/\\example.com'), '/dashboard');
assert.equal(safeInternalPath('/%5c%5cexample.com'), '/dashboard');
assert.equal(safeInternalPath('/%2f%2fexample.com'), '/dashboard');
assert.equal(safeInternalPath('/%'), '/dashboard');
assert.match(topbar, /<BrandLogo compact to="\/"/);
assert.match(topbar, /<BrandLogo to="\/"/);
assert.match(simulator, /event\.key !== 'Enter'/);
assert.match(simulator, /window\.addEventListener\('keydown', handleEnter\)/);
assert.match(simulator, /handlePrimaryAction\(\)/);

console.log('Safe navigation checks passed.');
