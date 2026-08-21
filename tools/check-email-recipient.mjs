import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolveEmailRecipient } from '../supabase/functions/api/_shared/email-recipient.ts';

const qaAlias = 'ivan.carlos23+simulador.qa.1785036845153@gmail.com';
const inbox = 'ivan.carlos23@gmail.com';

assert.deepEqual(resolveEmailRecipient(qaAlias, qaAlias, inbox, inbox), {
  originalRecipient: qaAlias,
  deliveryRecipient: inbox,
  allowed: true,
});
assert.equal(resolveEmailRecipient(inbox, qaAlias, inbox, inbox).allowed, true);
assert.equal(resolveEmailRecipient('otra-persona@example.com', qaAlias, inbox, inbox).allowed, false);
assert.equal(resolveEmailRecipient('', qaAlias, inbox, inbox).allowed, false);

const emailService = await readFile(new URL('../supabase/functions/api/_shared/email.ts', import.meta.url), 'utf8');
assert.match(emailService, /APP_ENV[^\n]*production/);
assert.match(emailService, /isProduction \? null : Deno\.env\.get\('RESEND_ALLOWED_RECIPIENT'\)/);

console.log('email recipient checks passed');
