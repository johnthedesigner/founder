# Project Retrospective — Phases 0–4

**Date:** 2026-05-07
**Scope:** Full retrospective covering all delivered phases (0, 1, 1b, 2, 3, 3b, 4)
**Status at writing:** Phase 4 complete. No Phase 5 task file yet.

---

## What we built

A design system generator with the following production-ready parts:

| Layer | What exists |
|---|---|
| **Pipeline** | OKLCH color generation, WCAG contrast correction, primitive/semantic/component token output, 7 preset palettes + custom brand colors, functional color derivation, component codegen (all Tier 1 + Tier 2), W3C DTCG JSON, CSS custom properties, Tailwind config, ZIP export |
| **Backend** | Express API, Postgres, JWT session auth, email verification, password reset, anonymous projects with owner_token, project CRUD + snapshots, generation endpoints, agent spec API (rate-limited, cached), CLI manifest endpoint |
| **Frontend** | 4-stage creation flow, live preview sandbox (postMessage), home page with project grid, auth flows (register/verify/login/logout/reset), project settings, `/settings` page with CLI token management |
| **Preview Sandbox** | Isolated Vite app, shows all 19 color shades for primary/secondary/accent/functional palettes, updates within 500ms of config change |
| **CLI** | `@ds-gen/cli` with `init` and `sync` commands, manifest-driven file writing, interactive token prompt, `~/.ds-gen/config.json` persistence |
| **Tests** | 281 backend unit tests (vitest), 25 Playwright E2E tests |

---

## What went well

### Pipeline-first sequencing

Starting with the generation pipeline in Phase 0 before any server or UI meant all business logic was deeply tested before anything depended on it. By the time Phase 1 wired the pipeline to an API endpoint, the pipeline had 100+ tests and clear contracts. Every subsequent phase could add features to the pipeline (functional colors in 3b, agent spec output in 1) with high confidence in the test coverage catching regressions.

The right call would have been hard to predict upfront — it feels obvious in retrospect, but many teams build the server first and then bolt on tests. Starting with pure TypeScript functions meant zero infrastructure friction during the most algorithmically complex part.

### Anonymous project model

The decision in Phase 1b to make `user_id` nullable and add `owner_token` — the CodePen model — gave the creation flow a key UX property: users can generate and share a design system without creating an account. The claim flow (post-registration ownership transfer) was a natural extension. This decision influenced every Phase 2 and Phase 3 implementation detail: the project PATCH uses `optionalAuth`, the home page only shows owned projects, the creation flow ends with a shareable URL before asking for an account.

Getting this right in Phase 1b rather than retrofitting it into Phase 3 saved significant rework.

### Shared types package

`@ds-gen/types` as a first-class workspace package meant the frontend, backend, CLI, and preview sandbox all import the same Zod schemas and TypeScript types. Every time the config schema changed (adding `paletteId` in 3b, adding `functionalColors`, adding CLI token fields), the type system caught every call site that needed updating. This was especially important when the pipeline and preview sandbox both needed to understand `ProjectConfig` — no hand-maintained interface duplication.

### Playwright catching what unit tests couldn't

Unit tests pass in isolation; Playwright tests exposed integration failures. Specific examples:
- Phase 2: Preview sandbox READY_TIMEOUT was too short — unit tests couldn't catch this because they don't run an actual browser.
- Phase 3b: Landing page routing change broke 13 tests simultaneously, forcing a clean fix across all test files rather than papering over individual failures.
- Phase 4: Parallel worker races against the shared test DB only appeared when multiple Playwright workers ran concurrently — a real production-class concurrency issue.

The cost of Playwright maintenance (updating selectors, fixing env/server issues) was consistently worth the confidence it provided.

### Pace of execution

All eight phases (counting 1b and 3b) were completed in approximately 7 sessions, with 4 tasks per phase on average. The per-task structure — what it implements, acceptance criteria, must-not-do — kept scope tight and prevented "while I'm in here" feature creep. The must-not-do sections in particular were load-bearing: "does not implement `ds-gen login` browser OAuth flow" and "does not add Redis" prevented scope inflation on multiple occasions.

---

## What was harder than expected

### Playwright test maintenance

This was the most recurring friction point across all phases. Every structural change to the frontend broke multiple Playwright tests. The root causes were different each time:
- Phase 2: `waitForSelector` timing issues and READY_TIMEOUT
- Phase 3b: Routing change (`/` → `/projects`), palette preset rename, chip selector ambiguity, and stale dev servers — all at once
- Phase 4: Parallel worker races on shared DB

The pattern: Playwright tests are integration tests and therefore sensitive to everything — routing, selectors, server state, env vars, concurrency. Each fix was correct and specific, but the aggregate debugging time across phases was significant.

**One systemic cause**: `reuseExistingServer: !process.env.CI` in `playwright.config.ts` meant that running `npx playwright test` during development often hit a dev server from a prior `npm run dev` session, with wrong env vars. The feedback from Phase 3b ("kill dev servers on ports 3001/5299/5180 before running Playwright tests") helped, but the correct long-term fix would be a simple script that kills those ports before running tests.

### Email as a permanent stub

The email service was stubbed from Phase 1 with console.log output. This was correct for testing — the `X-Verification-Token` header trick meant Playwright could register users without real email delivery. But the stub was never replaced with real email sending. After 4 phases, email is still not wired up for production. Any real user who tries to register on a deployed instance will never receive their verification email.

This is the highest-priority production blocker. It should have been wired up in Phase 1 or Phase 2 when the auth flow was first built.

### Dev database setup gap

The test database (`ds_gen_test`) is automatically migrated by the Playwright `webServer` config. The dev database (`ds_gen_dev`) is not — it requires a manual `npm run migrate:up` after initial setup. This caused a confusing failure mode: all 21 Playwright tests pass, but clicking "Download package" in the running dev app returns a 500 because the dev backend hits a table-not-found error. This was caught in Phase 3b and documented, but no DEVELOPMENT.md was ever written.

### Frontend API client binding

The frontend API client (`api/client.ts`) makes `fetch(path, ...)` calls with relative paths. During development, the Vite proxy forwards `/auth`, `/api`, and `/projects` to `localhost:3001`. This works perfectly in dev and test, but makes deployment non-trivial: the frontend cannot be hosted on a separate origin from the backend without either (a) a proxy layer, (b) a `VITE_API_BASE_URL` env var, or (c) having the backend serve the frontend's static files.

This was a reasonable early decision that optimizes for development simplicity. The cost surfaces at deployment time, not sooner, which is acceptable for an early-stage product — but it means deployment requires additional configuration that wasn't architected upfront.

### Preview sandbox `base` path coupling

The preview sandbox uses `base: '/preview/'` in its Vite config. This works in dev (the Vite proxy at `/preview` routes to the sandbox on port 5180) and is correct for serving the sandbox from a `/preview/` subpath in production. But it tightly couples the sandbox's deployment path to that specific URL prefix. Deploying the sandbox as a standalone static site requires copying its build output into `frontend/dist/preview/` rather than deploying it independently with `base: '/'`.

---

## Key decisions, assessed in retrospect

| Decision | Phase | Assessment |
|---|---|---|
| OKLCH color space | 0 | Correct. Perceptually uniform, accurate WCAG calculations, no conversion approximations. |
| Zod schemas co-located with TypeScript types | 0/1 | Correct. Runtime validation and static types from a single source of truth. No drift. |
| Anonymous projects / owner_token | 1b | Correct. Key UX enabler. Retrofitting this later would have been expensive. |
| Preview sandbox as separate Vite app with postMessage | 2 | Correct. Clean isolation. The sandbox imports `@pipeline` directly, which means the preview runs the real generation logic without an API call. |
| `workers: 1` in Playwright | 4 | Correct — but should have been set in Phase 1 when the first test was written. Parallel workers sharing a single backend DB is inherently racy. The right default for this project is always serial. |
| In-process spec cache (Map) instead of Redis | 4 | Correct for the current stage. Redis would add a managed service, cost, and operational complexity for a cache that stores at most a few KB per project. Revisit when traffic warrants. |
| Email as console.log stub | 1 | Wrong, or at least incomplete. It was correct for test isolation, but the stub should have been replaced with a real implementation in Phase 1 or 2. It wasn't — and now it's a production blocker. |
| Relative URLs in frontend API client | 1 | Reasonable at the time. The Vite proxy made development seamless. The cost (deployment complexity) only surfaces now. |
| Per-phase task file with acceptance criteria and must-not-do sections | All | Correct. Scope discipline was maintained throughout. The must-not-do constraints proved especially useful for resisting scope creep on tasks like the CLI (no OAuth flow, no dry-run, always overwrites). |

---

## Carried-forward debt

These are known issues — not surprises — that were consciously deferred.

| Issue | Priority | Notes |
|---|---|---|
| **Email sending is stubbed** | Critical | Production blocker. Users can't verify accounts. ~20 lines to fix with Resend. |
| **No deployment configuration** | High | No Dockerfile, no Render config, no CI/CD. Required before the product can reach real users. See `docs/deployment-guide.md`. |
| **No DEVELOPMENT.md** | Medium | Dev DB migration, port management, and workspace setup are undocumented. Onboarding a second contributor would be painful. |
| **`colorDirection` still in schema** | Low | Backward compat with existing DB rows. Needs a cleanup migration once all records are updated or deleted. |
| **Settings page lacks Playwright test** | Low | Task 4.2 acceptance criteria included this; Task 4.4 deferred it with "manual verification acceptable." |
| **CLI not published to npm** | Low | `@ds-gen/cli` is built and functional. Publish is manual and intentionally deferred. |
| **Preview sandbox base path** | Low | `base: '/preview/'` couples the sandbox to its deployment path. Clean up when deploying. |
| **Spec cache is in-process** | Future | The rate limiter and spec cache are module-level state. If the backend ever runs multiple instances (horizontal scaling), each instance has its own cache and rate limit state. Not a problem now, but not scalable without Redis or a sticky load balancer. |

---

## If starting again

Three things I'd do differently from day one:

1. **Wire up email in Phase 1, not as a stub.** Resend's API is simple enough (one HTTP call) that the stub was not actually saving significant time. Leaving it as a stub created a persistent gap between "tests pass" and "product works for real users."

2. **Add `VITE_API_BASE_URL` to the frontend API client from the start.** Defaulting to empty string (relative URL) preserves dev behavior. Setting it to the backend URL in production gives deployment flexibility without Vite proxy configuration on the host. One env var, added in Phase 1, would have made Phase 4 deployment trivially easy.

3. **Set `workers: 1` in `playwright.config.ts` from Phase 1.** The shared backend DB means parallel workers are always wrong for this project. This is a one-line fix that would have prevented one category of Playwright debugging in Phase 4.

---

## What Phase 5 should address first

Based on the debt list and the deployment guide (`docs/deployment-guide.md`):

1. Wire up Resend email (production blocker, ~30 minutes)
2. Add `frontend/public/_redirects` for Cloudflare Pages proxy (~5 minutes)
3. Update `app.ts` to allow multiple CORS origins OR rely on proxy (depends on deployment choice)
4. Build + deploy to Render + Cloudflare Pages + Neon
5. Write DEVELOPMENT.md
