import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const admin = read('supabase/functions/api/handlers/admin.ts');
const migration = read('supabase/migrations/20260830030124_extend_admin_retention_analytics.sql');

for (const column of [
  'first_device',
  'last_device',
  'last_active_at',
  'active_days',
  'started_sessions',
  'completed_sessions',
  'attempts',
  'returned_after_registration',
  'first_practice_at',
  'minutes_to_first_practice',
]) assert.match(migration, new RegExp(`\\b${column}\\b`), `Missing ${column} in admin_user_summary.`);

assert.match(migration, /with\s*\(security_invoker\s*=\s*true\)/i);
assert.match(migration, /revoke all on table public\.admin_user_summary from public, anon, authenticated, service_role/i);
assert.match(migration, /grant select on table public\.admin_user_summary to service_role/i);
assert.doesNotMatch(migration, /grant\s+select[\s\S]*\b(?:anon|authenticated)\b/i);
assert.match(migration, /at time zone 'UTC'/);
assert.match(migration, /at time zone 'America\/Lima'/);
assert.match(migration, /upper\(coalesce\(estado, ''\)\) = 'FINALIZADO'/);
assert.match(migration, /from public\.intento/);
assert.match(migration, /where device <> 'bot'/);

for (const field of [
  'firstDevice',
  'lastDevice',
  'lastActiveAt',
  'activeDays',
  'startedSessions',
  'completedSessions',
  'attempts',
  'returnedAfterRegistration',
  'firstPracticeAt',
  'minutesToFirstPractice',
]) assert.match(admin, new RegExp(`\\b${field}:`), `Missing ${field} in the admin API response.`);

assert.match(admin, /url\.searchParams\.get\('device'\)/);
assert.match(admin, /query = query\.eq\('first_device', device\)/);
assert.match(admin, /humanVisitors30Days: uniqueVisitors\(humanPageViews\)/);
assert.match(admin, /botVisitors30Days: uniqueVisitors\(botPageViews\)/);
assert.match(admin, /pageViewsToday: humanPageViewsToday\.length/);
assert.match(admin, /pageViewsThisMonth: humanPageViewsMonth\.length/);
assert.match(admin, /pageViews30Days: humanPageViews\.length/);
assert.match(admin, /uniqueVisitorsToday: uniqueVisitors\(humanPageViewsToday\)/);
assert.match(admin, /uniqueVisitorsThisMonth: uniqueVisitors\(humanPageViewsMonth\)/);
assert.match(admin, /uniqueVisitors30Days: uniqueVisitors\(humanPageViews\)/);
assert.match(admin, /devices: buildDevices\(humanPageViews\)/);
assert.match(admin, /funnel:\s*\{[\s\S]*registered:[\s\S]*started:[\s\S]*completed:[\s\S]*repeated:[\s\S]*returned:/);
assert.match(admin, /startedRate:[\s\S]*completedRate:[\s\S]*repeatedRate:[\s\S]*returnedRate:/);
assert.match(admin, /classifyDevice\(row\.user_agent\) !== 'bot'/);
assert.doesNotMatch(admin, /\b(?:userAgent|user_agent):\s*(?:user|row|event)\./, 'Raw user agents must not be returned.');

console.log('Retention analytics contract check passed');
