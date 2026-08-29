# SEO growth implementation

## Goal

Turn the 2026-08-29 SEO audit into a safe implementation that improves click-through rate, clarifies page intent, hardens crawl/security behavior, and starts a legitimate authority campaign without sacrificing current long-tail growth.

## Decisions

- Keep every indexed business page. Do not mass-redirect or noindex topic/question pages while organic visibility is growing.
- Give each page type one intent:
  - `/preguntas-mtc`: directory and discovery.
  - topic pages: grouped study guides.
  - category pages: simulator selection and practice.
  - individual question pages: exact answer and explanation.
- Use the actual Search Console queries from 2026-07-31 through 2026-08-27 to rewrite the five low-CTR pages.
- Replace crawlable registration query URLs in static HTML with hash-based deep links. The SPA consumes the fragment, opens registration, preserves category/destination, and removes the fragment.
- Enforce concise titles in the generator instead of fixing only the currently long titles.
- Add truthful `educationalAlignment` values derived from each page topic.
- Keep `/contacto` indexable as a trust page. Noindex legal/transactional routes that should not compete in search.
- Enforce security headers with an allowlist for the two Supabase projects and Culqi checkout/3DS.
- Pursue backlinks only through personalized editorial outreach. Never buy links, require reciprocal links, or submit to bulk directories.
- Monitor Search Console and mobile Core Web Vitals for 28 days; report weekly and alert on material regressions.

## Content and schema

The five target pages receive unique titles, descriptions, introductions, and supporting sections aligned to their observed queries. Topic hubs emphasize a collection of verified questions; individual question pages retain the exact-query intent. Internal links make that hierarchy explicit.

`LearningResource` markup receives an `AlignmentObject` whose target is the real MTC study topic or the general Peruvian driving-knowledge exam when no narrower topic exists.

## Crawl and registration flow

Generated calls to action use `/#register?...` rather than `/?auth=register...`. `LandingPage` parses only the expected fragment keys, validates the destination as an internal path through the existing navigation guard, opens the modal, and cleans the address bar. Unexpected fragments are ignored.

## Security and indexing

Global response headers include CSP, clickjacking protection, MIME sniffing protection, a strict referrer policy, and a limited permissions policy. CSP permits same-origin assets, the configured Supabase hosts, and Culqi's documented checkout and 3DS origins.

Terms, privacy, returns, complaint book, authentication, account, simulator, and checkout routes remain outside the search index. Contact remains indexable.

## Authority campaign

Create a local outreach ledger containing public contact URLs, relevance, proposed target page, send date, and outcome. Send a short message under CJ VERTEXLABS GROUP EIRL that offers the free study resource for editorial review without payment or reciprocity. Initial targets are driving schools, road-safety organizations, and Peruvian automotive publishers.

Backlinks are counted only after the third party publishes a live link.

## Verification

- Generator and SEO checks cover title length, registration fragments, schema alignment, noindex routes, and security headers.
- Existing auth, navigation, OAuth, payment, commerce, and remote-environment checks remain green.
- Preview verification covers registration deep links, anonymous browsing, Google OAuth entry, Culqi checkout loading, response headers, canonical/noindex behavior, and the five rewritten pages.
- LibreCrawl and Lighthouse run against preview before promotion and production after deployment.

## Rollout

1. Commit this design on `development`.
2. Implement and validate locally.
3. Push `development` and verify its Vercel deployment.
4. Promote the same commits to `main` by cherry-pick.
5. Verify production, submit outreach, and activate the 28-day monitor.
