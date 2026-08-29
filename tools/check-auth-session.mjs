import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [apiSource, authSource, authModalSource] = await Promise.all([
  readFile(new URL('../src/services/api.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/hooks/useAuth.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/auth/AuthModal.jsx', import.meta.url), 'utf8'),
]);
const {
  AUTH_INACTIVITY_TIMEOUT_MS,
  isAuthSessionInactive,
} = await import('../src/utils/sessionInactivity.js');

assert.match(apiSource, /AUTH_SESSION_EXPIRED_EVENT/);
assert.match(apiSource, /auth\.getSession\(\)/);
assert.match(apiSource, /auth\.refreshSession\(\)/);
assert.match(apiSource, /response\.status === 401/);
assert.match(apiSource, /dispatchEvent\(new Event\(AUTH_SESSION_EXPIRED_EVENT\)\)/);

assert.match(authSource, /auth\.onAuthStateChange/);
assert.match(authSource, /if \(!hasSupabaseSession\)/);
assert.match(authSource, /\[clearAuthentication, hasSupabaseSession\]/);
assert.match(authSource, /event === 'SIGNED_OUT'/);
assert.match(authSource, /AUTH_SESSION_EXPIRED_EVENT/);
assert.match(authSource, /auth\.signOut\(\{ scope: 'local' \}\)/);
assert.match(authSource, /\['pointerdown', 'keydown', 'scroll'\]/);
assert.match(authSource, /AUTH_INACTIVITY_BROADCAST_KEY/);
assert.match(authSource, /expireInactiveSession/);
assert.match(authModalSource, /AUTH_INACTIVITY_NOTICE_KEY/);
assert.match(authModalSource, /backdropPointerDownRef\.current = event\.target === event\.currentTarget/);
assert.match(authModalSource, /backdropPointerDownRef\.current && event\.target === event\.currentTarget/);
assert.match(authModalSource, /aria-label=\{visible \? 'Ocultar contraseña' : 'Mostrar contraseña'\}/);
assert.equal((authModalSource.match(/<PasswordInput /g) || []).length, 4);
assert.equal(AUTH_INACTIVITY_TIMEOUT_MS, 60 * 60 * 1000);
assert.equal(isAuthSessionInactive(null, 1_000), false);
assert.equal(isAuthSessionInactive(1_000, 1_000 + AUTH_INACTIVITY_TIMEOUT_MS - 1), false);
assert.equal(isAuthSessionInactive(1_000, 1_000 + AUTH_INACTIVITY_TIMEOUT_MS), true);

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
  api,
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

let loginAttempts = 0;
globalThis.fetch = async () => {
  loginAttempts += 1;
  if (loginAttempts === 1) throw new TypeError('Failed to fetch');
  return new Response(JSON.stringify({ error: 'Usuario o contrasena incorrectos' }), {
    headers: { 'Content-Type': 'application/json' },
    status: 401,
  });
};

await assert.rejects(
  api.login({ email: 'retry@example.test', password: 'not-a-real-password' }),
  (error) => error.status === 401,
);
assert.equal(loginAttempts, 2, 'Traditional login should recover from one transient network failure.');

console.log('Auth session recovery checks passed.');
