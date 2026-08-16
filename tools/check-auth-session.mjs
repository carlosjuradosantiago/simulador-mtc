import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [apiSource, authSource] = await Promise.all([
  readFile(new URL('../src/services/api.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/hooks/useAuth.js', import.meta.url), 'utf8'),
]);

assert.match(apiSource, /AUTH_SESSION_EXPIRED_EVENT/);
assert.match(apiSource, /auth\.getSession\(\)/);
assert.match(apiSource, /auth\.refreshSession\(\)/);
assert.match(apiSource, /response\.status === 401/);
assert.match(apiSource, /dispatchEvent\(new Event\(AUTH_SESSION_EXPIRED_EVENT\)\)/);

assert.match(authSource, /auth\.onAuthStateChange/);
assert.match(authSource, /event === 'SIGNED_OUT'/);
assert.match(authSource, /AUTH_SESSION_EXPIRED_EVENT/);
assert.match(authSource, /auth\.signOut\(\{ scope: 'local' \}\)/);

globalThis.__SIMULADOR_API_BASE_URL__ = 'https://api.example.test/api';
globalThis.__SIMULADOR_SUPABASE_URL__ = 'https://example.supabase.co';
globalThis.__SIMULADOR_SUPABASE_PUBLISHABLE_KEY__ = 'sb_publishable_session_check';

const values = new Map();
const dispatchedEvents = [];
globalThis.window = {
  atob: globalThis.atob,
  dispatchEvent: (event) => dispatchedEvents.push(event.type),
  localStorage: {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  },
};
globalThis.fetch = async () => new Response(JSON.stringify({ error: 'No autorizado' }), {
  headers: { 'Content-Type': 'application/json' },
  status: 401,
});

const {
  apiRequest,
  AUTH_SESSION_EXPIRED_EVENT,
  AUTH_TOKEN_KEY,
  isSupabaseAccessToken,
  setStoredToken,
} = await import('../src/services/api.js');

const encodePayload = (payload) => Buffer.from(JSON.stringify(payload)).toString('base64url');
const customToken = `header.${encodePayload({ sub: 'user', userId: 1 })}.signature`;
const supabaseToken = `header.${encodePayload({ iss: 'https://example.supabase.co/auth/v1' })}.signature`;
assert.equal(isSupabaseAccessToken(customToken), false);
assert.equal(isSupabaseAccessToken(supabaseToken), true);

setStoredToken(customToken);
await assert.rejects(apiRequest('/protected', { auth: true }), (error) => error.status === 401);
assert.equal(values.has(AUTH_TOKEN_KEY), false);
assert.deepEqual(dispatchedEvents, [AUTH_SESSION_EXPIRED_EVENT]);

console.log('Auth session recovery checks passed.');
