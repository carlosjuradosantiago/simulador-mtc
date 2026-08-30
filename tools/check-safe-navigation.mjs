import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseAuthFragment, safeInternalPath } from '../src/utils/navigation.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const topbar = read('src/components/layout/Topbar.jsx');
const simulator = read('src/pages/SimulatorPage.jsx');
const routes = read('src/routes/AppRoutes.jsx');

assert.equal(safeInternalPath('/dashboard'), '/dashboard');
assert.equal(safeInternalPath('/simulacro/25?mode=quick#pregunta'), '/simulacro/25?mode=quick#pregunta');
assert.equal(safeInternalPath('https://example.com'), '/dashboard');
assert.equal(safeInternalPath('//example.com'), '/dashboard');
assert.equal(safeInternalPath('/\\example.com'), '/dashboard');
assert.equal(safeInternalPath('/%5c%5cexample.com'), '/dashboard');
assert.equal(safeInternalPath('/%2f%2fexample.com'), '/dashboard');
assert.equal(safeInternalPath('/%'), '/dashboard');
assert.deepEqual(parseAuthFragment('#register'), { mode: 'register', redirectTo: '/dashboard', category: null });
assert.deepEqual(
  parseAuthFragment('#register?category=25&next=%2Fsimulacro%2F25%3Fmode%3Dexam'),
  { mode: 'register', redirectTo: '/simulacro/25?mode=exam', category: 25 },
);
assert.deepEqual(parseAuthFragment('#login?next=%2Fperfil'), { mode: 'login', redirectTo: '/perfil', category: null });
assert.deepEqual(parseAuthFragment('#register?next=https%3A%2F%2Fevil.test'), { mode: 'register', redirectTo: '/dashboard', category: null });
assert.equal(parseAuthFragment('#register?category=-1'), null);
assert.equal(parseAuthFragment('#register?category=25&category=24'), null);
assert.equal(parseAuthFragment('#register?unexpected=1'), null);
assert.equal(parseAuthFragment('#otro'), null);
assert.match(topbar, /<BrandLogo compact to="\/"/);
assert.match(topbar, /<BrandLogo to="\/"/);
assert.match(simulator, /event\.key !== 'Enter'/);
assert.match(simulator, /window\.addEventListener\('keydown', handleEnter\)/);
assert.match(simulator, /handlePrimaryAction\(\)/);
assert.match(routes, /window\.scrollTo\(\{ top: 0, left: 0, behavior: 'instant' \}\)/);

console.log('Safe navigation checks passed.');
