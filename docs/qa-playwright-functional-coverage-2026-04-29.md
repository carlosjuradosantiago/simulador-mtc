# SimulaManejo Playwright Functional QA - 2026-04-29

## Scope
Functional browser QA against the Vite frontend at `http://127.0.0.1:5174/` and the deployed Supabase Edge Function gateway.

No build was run.

## Passed Coverage

| Area | Coverage | Result |
| --- | --- | --- |
| Landing | Main CTAs to login/register and footer category hash | PASS |
| Login | Forgot-password feedback, invalid credentials error, valid login | PASS |
| Register | Required fields, password mismatch, real account creation | PASS |
| Dashboard | Real data load, start simulator CTA, desktop topbar search to question bank | PASS |
| Simulator | Start exam, answer option, mark question, navigate grid, finish exam | PASS |
| Simulator data | Stats increment, history receives new attempt, detail endpoint returns attempt | PASS |
| Simulator race | Double-click finish creates only one attempt | PASS |
| Simulator gated access | Second free attempt is blocked until membership is activated | PASS |
| Results | Result detail loads, review button scrolls to errors, recommendation links route correctly | PASS |
| Question bank | Search query, filters render, explanation toggle | PASS |
| Classes | View class updates progress | PASS |
| Plans | Plan selection, method tabs, promo feedback, subscribe flow, success modal | PASS |
| Profile | Active plan visible, edit profile navigates to settings | PASS |
| Settings | Save name/category/notifications, delete-account status feedback, logout clears token | PASS |
| Complaint book | Required validation, good type, claim type, file selection, reset, real submit and claim number | PASS |
| Ranking | Category filter and summary render | PASS |
| Navigation | Desktop/sidebar routes, mobile menu open -> navigate -> close | PASS |
| Notifications | Dashboard and simulator notification controls navigate to settings | PASS |

## Fixed During QA

- `Revisar respuestas` in results had no action; it now scrolls to the questions-with-error table.
- `Ver clases` recommendation routed to question bank; it now routes to `/clases`.
- Promo code `Aplicar` had no feedback; it now validates locally and reports status.
- `Editar perfil` had no action; it now routes to `/configuracion`.
- `Eliminar cuenta` had an empty handler; it now explains that manual support validation is required.
- Login forgot-password link had no action; it now shows recovery-flow feedback.
- Notification buttons were inert; they now route to settings.
- Landing footer links used placeholder hashes; they now point to real routes/hashes.
- Dashboard search was decorative; it now routes to question bank with `?search=`.
- Complaint attachment area was decorative; it now opens a file input and shows selected file count.

## Backend/Business Limits Still Explicit

These are no longer silent buttons, but they are not full backend implementations yet:

- Account deletion: UI reports manual validation because no delete-account endpoint exists yet.
- Password recovery: UI reports pending email recovery flow because no reset endpoint/email workflow is wired yet.
- Promo codes: UI reports validation feedback, but no promo-code backend endpoint exists yet.
- Complaint attachments: files can be selected and counted in UI, but the current complaint endpoint does not persist file uploads.
- Payments: subscription activation uses the membership endpoint; real Culqi card tokenization is still a separate integration.

## Test Data

Temporary users used patterns like `pw_fullqa_*@example.com` and `pw_claim_*@example.com`. Cleanup migrations should delete `pw_*@example.com` users and related attempts, memberships, settings, payment transactions, sessions, and complaints after QA.
