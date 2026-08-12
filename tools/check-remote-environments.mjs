import assert from 'node:assert/strict';
import { resolveRemoteEnvironment } from '../src/config/remoteEnvironments.js';

const development = resolveRemoteEnvironment('development');
const preview = resolveRemoteEnvironment('preview');
const production = resolveRemoteEnvironment('production');

assert.match(development.supabaseUrl, /flrvcaizsjhieuvhqkxh/);
assert.equal(preview.supabaseUrl, development.supabaseUrl);
assert.match(production.supabaseUrl, /wazikdsfacrawhphzltn/);
assert.notEqual(development.supabaseUrl, production.supabaseUrl);

console.log('Remote development and production environments are isolated.');
