import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const [apiSource, callbackSource, packageJson] = await Promise.all([
  readFile(new URL('../src/services/api.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/pages/AuthCallbackPage.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../package.json', import.meta.url), 'utf8').then(JSON.parse),
]);

assert.equal(packageJson.dependencies['@supabase/supabase-js'], '2.112.3');
assert.match(apiSource, /appendPkceFlowIdToRedirects:\s*true/);
assert.doesNotMatch(apiSource, /removeItem\(['"]simulamanejo:supabase-auth-code-verifier/);

const initializeIndex = apiSource.indexOf('await supabaseAuth.auth.initialize()');
const oauthIndex = apiSource.indexOf('await supabaseAuth.auth.signInWithOAuth');
assert.ok(initializeIndex >= 0 && initializeIndex < oauthIndex, 'Supabase must initialize before starting OAuth');

assert.match(apiSource, /exchangeSupabaseOAuthCode\(code, flowId = null\)/);
assert.match(apiSource, /flowId \? \{ flowId \} : undefined/);
assert.match(callbackSource, /searchParams\.get\('sb_flow_id'\)/);
assert.match(callbackSource, /exchangeSupabaseOAuthCode\(authCode, flowId\)/);
assert.match(callbackSource, /const loginWithTokenRef = useRef\(loginWithToken\)/);
assert.match(callbackSource, /loginWithTokenRef\.current\(token, \{ category: pendingCategory \}\)/);
assert.doesNotMatch(callbackSource, /\[loginWithToken, navigate, searchParams\]/);

const values = new Map();
const storage = {
  getItem: (key) => values.get(key) ?? null,
  removeItem: (key) => values.delete(key),
  setItem: (key, value) => values.set(key, value),
};
const client = createClient('https://oauth-check.supabase.co', 'sb_publishable_oauth_check', {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    experimental: { appendPkceFlowIdToRedirects: true },
    flowType: 'pkce',
    persistSession: true,
    storage,
    storageKey: 'oauth-check',
  },
});
await client.auth.initialize();

const callback = 'https://www.simuladormtc.com/auth/callback?next=%2Fdashboard';
const { data, error } = await client.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: callback, skipBrowserRedirect: true },
});
assert.equal(error, null);
assert.ok(data.flowId, 'OAuth must expose a PKCE flow id');

const providerUrl = new URL(data.url);
const returnedCallback = new URL(providerUrl.searchParams.get('redirect_to'));
assert.equal(returnedCallback.searchParams.get('next'), '/dashboard');
assert.equal(returnedCallback.searchParams.get('sb_flow_id'), data.flowId);
assert.ok(values.has(`oauth-check-flow-${data.flowId}-code-verifier`));

console.log('Google OAuth PKCE flow checks passed.');
