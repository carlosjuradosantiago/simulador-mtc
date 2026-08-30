# Retention, mobile UX, and analytics design

## Goal

Improve the first-session completion and return rate without rebuilding the
public site. Make the admin dashboard explain activation, completion, device,
and retention while keeping production data private.

## Evidence

- Current cohort since 2026-08-18: 52 registrations, 73.1% started, 46.2%
  completed, 17.3% repeated, and 7.7% returned on another day.
- Median registration-to-first-session time is 0.6 minutes.
- Mobile is 45.8% of human visitors and is not performing worse in the
  identified sample.
- Analytics currently records only `page_view`; `user_agent` is stored but not
  exposed in the admin API.
- The admin users table forces a 720px minimum width.

## Product direction

The product should optimize for one quick success before asking for a long
exam. New users see the five-question practice as the primary first action;
adaptive and timed sessions remain available as the next step.

The admin experience should answer: which device brought the user, did they
start, did they finish, did they return, and when were they last active?

## Data design

- Keep `eventos_analytics` as the event source; do not add a duplicate table.
- Add funnel events for vehicle selection, practice mode selection, auth open,
  verified password registration, Google auth completion, and practice start.
- Google auth does not expose a reliable account-created flag, so
  `google_auth_completed` records the OAuth outcome without claiming a new
  registration.
- Derive the admin registration, completion, abandonment, and return funnel
  from database users, sessions, attempts, and activity rather than client
  events.
- Classify user agents server-side into mobile, desktop, tablet, bot, or unknown.
- Extend the security-invoker admin summary view with first/last device, last
  activity, active days, started sessions, completed sessions, and attempts.
- Exclude bots from human traffic metrics.

## Interface design

**Intent:** A driving-exam candidate should get a fast, reassuring first win;
the administrator should diagnose drop-off in seconds.

**Palette and depth:** Preserve the existing road-safety blue, green success,
amber attention, quiet slate surfaces, subtle borders, and current typography.
No new visual system or dependency.

- Public flow: promote “Practicar 5 preguntas” for a user without practice
  history, then point to adaptive training after completion.
- Admin desktop: retain the dense table and add diagnostic columns/filters.
- Admin mobile: render compact user cards instead of a horizontally scrolling
  table.
- Add cohort/funnel and device summaries using existing Card/Badge patterns.

## Retention loop

- Show a single next action after a completed quick practice.
- Surface a daily five-question goal and returning-user progress in the app.
- Build the analytics hooks required for 24-hour lifecycle reminders; do not
  send unsolicited email in this change.

## Privacy and security

- Never expose raw user-agent strings to the UI.
- Keep the admin view `security_invoker = true` and service-role only.
- Return aggregates and classified devices, not browsing histories.
- Treat reminders as a future opt-in workflow using the existing notification
  preference.

## Verification

- Add/update lightweight repository checks for event taxonomy, quick-first UX,
  admin device fields, bot exclusion, and mobile card rendering.
- Run all focused checks plus the production build.
- Validate the new view and API shape on development before production.
- Verify desktop and 375px mobile flows with browser screenshots.
