# SimulaManejo Supabase Functional Backend Analysis

## Context

The React app currently behaves as a frontend-only simulator with mock data and localStorage. The linked Supabase project is `bdsimulador` (`wazikdsfacrawhphzltn`) and already contains the real question bank and one deployed Edge Function named `api`.

The remote database has two model families:

- Spanish production model in active use by the Edge Function and data: `tipo_examen`, `categoria`, `pregunta`, `opcion_pregunta`, `multimedia_pregunta`, `categoria_pregunta`, `usuarios`, `sesion_practica`, `intento`, `planes_membresia`, `membresias_usuario`, `transacciones_pago`, `libro_reclamaciones`.
- English legacy/unused model with zero records in question/exam tables: `category`, `question`, `question_option`, `attempt`, `membership_plans`, `user_memberships`.

Record counts observed through PostgREST with service role:

| Table | Count |
| --- | ---: |
| tipo_examen | 1 |
| categoria | 11 |
| pregunta | 1238 |
| opcion_pregunta | 4952 |
| multimedia_pregunta | 71 |
| categoria_pregunta | 2397 |
| users | 8 |
| usuarios | 6 |
| sesion_practica | 36 |
| intento | 6 |
| respuesta_intento | 0 |
| planes_membresia | 1 |
| membresias_usuario | 0 |
| transacciones_pago | 26 |
| libro_reclamaciones | 6 |
| edge_function_logs | 1674 |
| category/question/question_option/attempt | 0 |

## Functional Areas

### Public and Auth

Frontend pages: landing, login, register.

Backend needs:

- Traditional login/register through Edge Function.
- Canonical user identity must be `usuarios.id` because active transactional tables reference `usuarios`.
- `users` can remain as a legacy compatibility table for billing/profile fields, but new transactional writes should not depend on `users.id`.

Edge Function:

- `POST /auth/login`
- `POST /auth/register`

### Master Data

Frontend uses categories, plans, classes, and question metadata.

Backend reads:

- `tipo_examen`
- `categoria`
- `pregunta`
- `opcion_pregunta`
- `multimedia_pregunta`
- `categoria_pregunta`
- `planes_membresia`
- New needed tables: `clases`, `lecciones_clase`

Edge Function:

- `GET /categories/tipo-examen/:id`
- `GET /preguntas/examen-cronometrado/tipo-examen/:tipoExamenId/categoria/:categoriaId`
- New recommended routes: `GET /classes`, `GET /question-bank`

### Simulator and Exam Results

Frontend flow: start timed exam, answer questions, mark review, finish, calculate topic breakdown, show result detail/history.

Backend transactions:

- Create `sesion_practica` on exam start.
- Persist individual answers in `respuesta_intento` or final JSON detail.
- Finalize session and create immutable `intento` result.
- Store score, correct/incorrect/unanswered, percentage, approved flag, category, topic breakdown, marked questions, time used.

Current gaps:

- Existing handlers insert/update columns that are missing in `sesion_practica` and `intento`.
- Existing pass threshold differs from frontend: API uses 90%, frontend uses 80%. The app should use one policy. Recommended for current frontend parity: 80%.

Edge Function:

- `GET /preguntas/examen-cronometrado/tipo-examen/:id/categoria/:id`
- `POST /practica/:sessionId/respuesta`
- `POST /exams/submit`
- `GET /user/exam-history`
- `GET /user/exam-history/recent`
- `GET /user/exam-history/:attemptId`
- `GET /user/stats`
- New recommended route: `GET /ranking`

### Payments and Memberships

Frontend flow: select plan, submit payment, activate plan, show active subscription.

Backend transactions:

- Create `transacciones_pago` pending record.
- Call Culqi.
- Update transaction to success/failure/3DS pending.
- Activate or renew `membresias_usuario`.
- Insert `historial_membresias`.
- Send confirmation email via Resend.

Existing function already covers Culqi/Resend but must use canonical `usuarios.id` and not `users.id` for membership/payment tables.

Edge Function:

- `GET /pagos/config`
- `POST /pagos/procesar`
- `GET /pagos/historial`
- `GET /membership-plans`
- `GET /user/membership/active`
- `POST /user/membership/subscribe`
- `GET /user/exam-count`

### Complaint Book

Frontend flow: user submits legal complaint/claim form.

Backend transactions:

- Insert `libro_reclamaciones` with immutable audit data.
- Generate unique claim number.
- Calculate legal deadline for `RECLAMO`.
- Send confirmation to consumer and notification to provider.
- Allow status lookup by claim number.

Current gaps:

- Function has a development-only `/libro-reclamaciones/setup` route that attempts DDL from runtime. This must be removed or disabled in production.
- Claim number generation is random; collision risk is low but real. Handler should retry on unique violation.

Edge Function:

- `POST /libro-reclamaciones`
- `GET /libro-reclamaciones/info`
- `GET /libro-reclamaciones/:numeroReclamo`

### Classes and Progress

Frontend page: classes with progress tracking.

Backend needs:

- Master `clases` table.
- Optional lesson table.
- Transactional `progreso_clase_usuario` table.
- Routes to list classes and upsert progress.

### Settings and Profile

Frontend pages: profile/settings, notifications, category preference, delete account UI.

Backend needs:

- User settings table keyed by `usuarios.id`.
- Update profile endpoint.
- Update settings endpoint.
- Account deletion/deactivation should be soft-delete/deactivate, not hard-delete, because attempts/payments/complaints need audit history.

## Required Database Changes

Adopt the Spanish model as canonical and add missing compatible fields rather than deleting or renaming existing tables.

1. Add missing result/session columns to `sesion_practica` and `intento`.
2. Add `configuracion_usuario` for notifications/category preferences.
3. Add `clases`, `lecciones_clase`, and `progreso_clase_usuario`.
4. Add views for ranking and user progress summaries.
5. Add indexes on transactional lookups.
6. Keep existing question tables and loaded data untouched.

## Required Edge Function Changes

1. Remove hardcoded `SUPABASE_SERVICE_ROLE_KEY` fallback.
2. Remove insecure default `JWT_SECRET` fallback.
3. Resolve authenticated users to canonical `usuarios.id` by email/username.
4. Align exam submit/finalize with actual Spanish table columns and 80% frontend threshold.
5. Add missing route coverage for ranking, classes, settings, and question bank.
6. Disable development DDL route `/libro-reclamaciones/setup`.
7. Make complaint number insert collision-safe.

## Verification Plan

1. Run TypeScript/Deno check for the Edge Function.
2. Push DB migration with `supabase db push`.
3. Deploy `api` with `supabase functions deploy api --use-api`.
4. Test health and public master endpoints.
5. Test auth/register/login.
6. Test protected profile/stats/history endpoints with token.
7. Test exam start and submit flow.
8. Test membership endpoints and payment config/history. Avoid real payment charge unless using Culqi test token.
9. Test complaint book submit/info/lookup.
10. Test with Playwright against Edge Function HTTP endpoints and app flows.
