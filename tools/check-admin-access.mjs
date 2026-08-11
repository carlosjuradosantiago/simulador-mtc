import assert from 'node:assert/strict';
import { isAdminRole, isAdminUser } from '../src/utils/admin.js';

assert.equal(isAdminRole('ADMIN'), true);
assert.equal(isAdminRole('admin'), true);
assert.equal(isAdminRole('USUARIO'), false);
assert.equal(isAdminUser({ role: 'ADMIN' }), true);
assert.equal(isAdminUser({ role: 'USUARIO', email: 'ivan.carlos23@gmail.com' }), false);
assert.equal(isAdminUser({ role: 'USUARIO', isAdmin: true }), false);

console.log('Admin access check passed.');