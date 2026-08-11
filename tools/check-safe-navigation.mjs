import assert from 'node:assert/strict';
import { safeInternalPath } from '../src/utils/navigation.js';

assert.equal(safeInternalPath('/dashboard'), '/dashboard');
assert.equal(safeInternalPath('/simulacro/25?mode=quick#pregunta'), '/simulacro/25?mode=quick#pregunta');
assert.equal(safeInternalPath('https://example.com'), '/dashboard');
assert.equal(safeInternalPath('//example.com'), '/dashboard');
assert.equal(safeInternalPath('/\\example.com'), '/dashboard');
assert.equal(safeInternalPath('/%5c%5cexample.com'), '/dashboard');
assert.equal(safeInternalPath('/%2f%2fexample.com'), '/dashboard');
assert.equal(safeInternalPath('/%'), '/dashboard');

console.log('Safe navigation checks passed.');
