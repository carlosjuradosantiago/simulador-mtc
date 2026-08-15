import assert from 'node:assert/strict';
import { classifyTrafficSource } from '../supabase/functions/api/_shared/traffic-source.ts';

assert.equal(classifyTrafficSource('/?utm_source=Newsletter', ''), 'newsletter');
assert.equal(classifyTrafficSource('/', 'https://www.google.com/search?q=simulador+mtc'), 'Google');
assert.equal(classifyTrafficSource('/', 'https://chatgpt.com/c/example'), 'ChatGPT');
assert.equal(classifyTrafficSource('/', 'https://www.perplexity.ai/search/example'), 'Perplexity');
assert.equal(classifyTrafficSource('/', 'https://simuladormtc.com/simulador-mtc'), 'Navegación interna');
assert.equal(classifyTrafficSource('/', ''), 'Directo');
assert.equal(classifyTrafficSource('/', 'not a url'), 'Otro sitio');

console.log('Traffic source classification check passed');
