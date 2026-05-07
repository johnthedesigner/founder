# Phase 4 Retrospective — CLI and Agent API

**Date:** 2026-05-07
**Tasks:** 4.1–4.4
**Session count:** 1 (all tasks completed in a single session)

---

## What went well

- **CLI in one session:** All five CLI source files (`config.ts`, `manifest.ts`, `index.ts`, `init.ts`, `sync.ts`) fell into place quickly because the manifest endpoint was already fully implemented in Phase 1. The CLI is a thin client — fetch, write, done.
- **JWT re-signing for `GET /auth/cli-token`:** The insight that `cliAuth` validates by JTI (not the raw token) meant we could re-sign a fresh JWT with the stored JTI, getting a working token display without any schema change or raw-JWT storage.
- **Rate limit test isolation via `resetKey`:** Exporting `specRateLimiter` and calling `resetKey(ip)` in `beforeEach` cleanly prevented cross-test bleed without any global state hacks — the 61-request test ran fast (~500ms) thanks to the cache absorbing all 60 warm-up calls.
- **Cache invalidation wiring:** `invalidateSpecCache(id)` dropped in as one line in the PATCH handler — the separation between `projects.ts` and `generate.ts` stayed clean.

---

## Harder than expected

- **CommonJS CLI tsconfig:** Extending `tsconfig.base.json` caused runtime `require()` failures because the base uses `module: ESNext` / `moduleResolution: bundler`. Required a fully standalone `cli/tsconfig.json` — not obvious until the compiled output failed at runtime rather than compile time.
- **Playwright parallel-worker races:** With two workers sharing one backend DB, concurrent registration tests (phase-1 + phase-4 running in parallel) produced intermittent failures — the email verification flow lost the `X-Verification-Token` header under load. `workers: 1` fixed it cleanly, but diagnosing the root cause (worker parallelism vs. shared DB) took iteration.
- **Agent spec shape vs. journey doc:** The journey doc (step 5.1.3) described `rules.tokenUsage` as a string on a `rules` object. The actual pipeline generates `rules` as `string[]`. Tests had to be written against the real shape discovered by reading the code, not the doc.

---

## Key decisions

| Decision | Rationale |
|---|---|
| CLI tsconfig standalone (no extends) | Base uses ESNext/bundler — incompatible with Node CommonJS runtime |
| `DS_GEN_API_URL` env var in CLI | Playwright runs `execSync` pointing at `localhost:3001` — must be overridable without recompiling |
| `getCliToken` re-signs JWT with stored JTI | No raw JWT in DB; JTI lookup is what `cliAuth` validates against — re-signing is equivalent |
| `clearSpecCache()` separate from `invalidateSpecCache(id)` | Tests need to clear all entries in `beforeEach`; `invalidateSpecCache('')` only deletes the empty-string key |
| `optionalAuth` before `specRateLimiter` | Rate limiter's `skip` function reads `req.user`, which is only set after auth middleware runs |
| `workers: 1` in playwright.config.ts | Shared backend DB + concurrent workers = intermittent registration race; sequential execution is the simplest fix |
| `POST /auth/cli-token` kept alongside `GET` and `DELETE` | Backward compat — Playwright phase tests already call `POST`; didn't want to break them mid-phase |

---

## Carry-forwards to Phase 5

- **Settings page Playwright test:** Task 4.2 acceptance criteria includes an E2E test for the settings page (blur/reveal, copy, revoke). It was intentionally skipped in Task 4.4 ("manual verification acceptable for Phase 4"). Phase 5 should either add it or formally descope it.
- **CLI publish:** The `@ds-gen/cli` package is built but not published to npm. Phase 5+ can add a `publish` script or CI job when ready.
- **Rate limit header exposure:** `express-rate-limit` emits `RateLimit-Remaining` headers. Surfacing remaining count to frontend callers could be useful once the agent API has paying customers, but was intentionally out of scope for Phase 4.
