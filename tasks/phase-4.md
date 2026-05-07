# Phase 4 — CLI and Agent API

> **Status:** In progress
> **Depends on:** Phase 3b complete (all tasks marked `[x]`, all tests passing)
> **Reference:** `docs/design-system-dev-plan.md` § Phase 4 — CLI and Agent API

---

## Overview

The CLI tool (`@ds-gen/cli`) is buildable and functional. A user can run `npx @ds-gen/cli init --project=<id>` and get their design system files written to disk. The agent API gains rate limiting and in-process response caching. Both are surfaced in the frontend: the project export page shows the agent API URL, and account settings show the CLI auth token.

No new database migrations are required. The CLI manifest endpoint (`GET /api/v1/systems/:projectId/manifest`) is already live from Phase 1. The `issueCliToken` / revoke flow and the agent spec endpoint also exist — Phase 4 wires them into the frontend and adds hardening (rate limit, cache).

---

## Tasks

### Task 4.1 — CLI package (`@ds-gen/cli`)

> **Status:** `[x]` Complete
> **Session:** 2026-05-07
> **Depends on:** Phase 3b complete

**What this task implements:**
The `cli/` package is set up with TypeScript, builds to a standalone JS entry point, and implements `init` and `sync` commands against the existing manifest endpoint. Auth token is read from `~/.ds-gen/config.json`; if missing, the CLI prompts for it and saves it.

**Files to create or modify:**
- `cli/package.json` — new package: `name: "@ds-gen/cli"`, `bin: { "ds-gen": "dist/index.js" }`, dependencies: `node-fetch` (or native fetch if Node ≥ 18), `prompts`, `fs-extra`
- `cli/tsconfig.json` — new: target `node18`, `module: commonjs`, `outDir: dist`
- `cli/src/index.ts` — new: CLI entry point; parses `init` and `sync` subcommands; delegates to command modules
- `cli/src/commands/init.ts` — new: reads `--project` flag; loads or prompts for auth token; calls `fetchManifest(projectId, token)`; writes all files; writes `.design-system-meta.json`
- `cli/src/commands/sync.ts` — new: reads `.design-system-meta.json`; calls `fetchManifest`; overwrites files; updates timestamp
- `cli/src/manifest.ts` — new: `fetchManifest(projectId: string, token: string): Promise<Manifest>` — calls `GET /api/v1/systems/:projectId/manifest` with `Authorization: Bearer <token>` header
- `cli/src/config.ts` — new: read/write `~/.ds-gen/config.json` for persistent auth token storage
- Root `package.json` — add `cli` to workspaces

**Acceptance criteria:**
- [ ] `cd cli && npm run build` succeeds
- [ ] `node dist/index.js init --project=<id>` with a valid token writes the expected files (tokens/, components/, docs/) to the current directory
- [ ] `node dist/index.js sync` reads `.design-system-meta.json` and re-fetches + overwrites files
- [ ] Missing auth token prompts the user and saves the answer to `~/.ds-gen/config.json`
- [ ] Unknown project ID prints a clear error and exits non-zero
- [ ] `tsc --noEmit` passes in `cli/`
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- Does not publish to npm (publish is a manual step outside CI for now)
- Does not implement `ds-gen login` browser OAuth flow — token is copy-pasted from account settings
- Does not add file diffing or dry-run — it always overwrites

---

### Task 4.2 — Account settings page with CLI token

> **Status:** `[x]` Complete
> **Session:** 2026-05-07
> **Depends on:** Task 4.1

**What this task implements:**
A `/settings` page accessible from the home page header. Shows one section: "CLI access". Displays the user's CLI auth token (blurred by default, revealed on click), a copy button, a "Revoke and regenerate" button, and inline `init` / `sync` command examples with the real project ID substituted.

**Files to create or modify:**
- `frontend/src/components/settings/SettingsPage.tsx` — new: layout with "← Home" link; "CLI access" section
- `frontend/src/components/settings/CliTokenSection.tsx` — new: reads token from `GET /auth/cli-token`; blur/reveal toggle; copy button; revoke button (`DELETE /auth/cli-token` then re-fetch); command snippets
- `frontend/src/api/auth.ts` — add `getCliToken(): Promise<{ token: string }>` and `revokeCliToken(): Promise<void>`
- `frontend/src/App.tsx` (or router file) — add route `/settings → <SettingsPage />`
- `frontend/src/components/home/HomePage.tsx` — add settings icon/link in header pointing to `/settings`

**Acceptance criteria:**
- [ ] Navigating to `/settings` while authenticated shows the CLI section
- [ ] Auth token is blurred by default; clicking "Reveal" shows it in plain text
- [ ] "Copy" copies the token to the clipboard
- [ ] "Revoke and regenerate" calls the revoke endpoint and reloads the token
- [ ] Command snippets show `npx @ds-gen/cli init --project=<example-id>` (static example, not a real project ID)
- [ ] Unauthenticated access to `/settings` redirects to `/login`
- [ ] `tsc --noEmit` passes
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- Does not implement profile editing (display name / email / password change) — those are Phase 5+
- Does not show project-specific CLI commands from within the settings page

---

### Task 4.3 — Agent API hardening and frontend exposure

> **Status:** `[x]` Complete
> **Session:** 2026-05-07
> **Depends on:** Task 4.2

**What this task implements:**
The existing `GET /api/v1/systems/:projectId/spec` endpoint gains rate limiting (60 req/min per IP) and a 60-second in-process response cache invalidated on project PATCH. The agent API URL is surfaced on the project page (Stage 4 / export section) as a copyable link.

**Files to create or modify:**
- `backend/src/api/agent.ts` — add `express-rate-limit` middleware on the spec route; add in-process `Map<string, { spec: object; cachedAt: number }>` cache; cache is checked before generation and invalidated in the `PATCH /projects/:id` handler
- `backend/src/api/projects.ts` — call `invalidateAgentCache(id)` (or clear the cache entry) after a successful PATCH
- `frontend/src/components/flow/Stage4.tsx` — when `savedProjectId` is non-null, add an "Agent API" row showing the spec URL with a copy button (below the CLI row)

**Acceptance criteria:**
- [ ] `GET /api/v1/systems/:id/spec` returns `429` after 60 requests in 60 seconds from the same IP
- [ ] Second call to the spec endpoint within 60s returns the cached response (assert by checking a fast response time or by intercepting the generation function)
- [ ] PATCHing a project invalidates its cache (subsequent GET regenerates)
- [ ] Agent API URL is visible on Stage 4 of a saved project, with a copy button
- [ ] `tsc --noEmit` passes in `backend/` and `frontend/`
- [ ] `cd backend && npm test`: zero failures (rate limit + cache unit tests added)
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- Does not add Redis or any external cache — in-process `Map` only
- Does not rate-limit authenticated project owners (only anonymous/agent callers)
- Does not add the agent API URL to the home page project cards

---

### Task 4.4 — Playwright Phase 4 tests

> **Status:** `[x]` Complete
> **Session:** 2026-05-07
> **Depends on:** Tasks 4.1, 4.2, 4.3

**What this task implements:**
Four Playwright tests: CLI init writes files, CLI sync updates files, agent API returns valid spec, agent API returns 404 for unknown project.

Journey steps covered: 4.2.3, 4.2.4, 5.1.1–5.1.4

**Files to create or modify:**
- `frontend/tests/e2e/phase-4.spec.ts` — 4 new tests (see below)
- `docs/user-journeys.md` — update coverage table to mark 4.2.3, 4.2.4, 5.1.1–5.1.4 as covered

**Tests:**

**Test 1 — CLI init writes expected files** (Journey 4.2.3)
1. Register + verify + login + create a project (via `page.evaluate`)
2. Issue CLI token via `page.request.get` (or API)
3. Run `node cli/dist/index.js init --project=<id>` with `DS_GEN_TOKEN=<token>` env var in a temp directory via `execSync`
4. Assert temp directory contains `tokens/`, `components/`, `docs/` with at least one file each

**Test 2 — CLI sync updates files** (Journey 4.2.4)
1. Run `init` (as above) to write initial files
2. PATCH the project config via API
3. Run `node cli/dist/index.js sync` in the same temp directory
4. Assert `.design-system-meta.json` has an updated `generatedAt` timestamp

**Test 3 — Agent API returns valid spec** (Journey 5.1.1–5.1.4)
1. Create a project via `request` fixture (anonymous)
2. `GET /api/v1/systems/:id/spec`
3. Assert response is 200 with JSON containing `tokens`, `components`, `rules` keys
4. Assert `rules.tokenUsage` is a non-empty string

**Test 4 — Agent API 404 for unknown project**
1. `GET /api/v1/systems/nonexistent-id/spec`
2. Assert response is 404

**Acceptance criteria:**
- [ ] All 4 tests pass: `cd frontend && npx playwright test phase-4`
- [ ] All prior tests still pass: `npx playwright test` (16 + 4 = 20 total)
- [ ] `docs/user-journeys.md` coverage table updated
- [ ] `tsc --noEmit` passes
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- Does not test rate limiting end-to-end in Playwright (backend unit test is sufficient)
- Does not test the settings page in Playwright (manual verification acceptable for Phase 4)

---

## Phase completion checklist

Run this checklist before marking the phase complete.

- [ ] All 4 tasks above are marked `[x]`
- [ ] `cd backend && npm test`: zero failures
- [ ] `cd frontend && npx playwright test`: all tests pass (target: 20 total)
- [ ] `tsc --noEmit` in `backend/`, `frontend/`, `cli/`, `packages/types/`: zero errors
- [ ] `SESSION_LOG.md` has a complete entry for every session in this phase
- [ ] `docs/design-system-plan-summary.md` updated to reflect Phase 4 complete
- [ ] `docs/user-journeys.md` reviewed — coverage table updated
- [ ] Phase retrospective written to `docs/phase-4-retro.md`
- [ ] Session log archived to `logs/phase-4.md`

---

## Completed task log

*(Tasks are compressed to this format once complete. Full details live in the session log.)*

### Task 4.4 — Playwright Phase 4 tests ✓
**Output:** `frontend/tests/e2e/phase-4.spec.ts` with 4 tests: (1) CLI init writes `tokens/`, `components/`, `docs/` + meta file with correct projectId; (2) CLI sync updates `generatedAt` timestamp; (3) agent API GET /spec returns 200 with valid `tokens`, `components`, `rules` shape; (4) agent API returns 404 for unknown project. Added `workers: 1` to `playwright.config.ts` to prevent parallel-worker races against the shared test DB. All 25 tests passing.
**Key decisions:** `workers: 1` in playwright.config.ts — parallel workers sharing one backend DB caused intermittent race conditions on user registration; sequential execution eliminates these without any test logic changes. Tests assert against the actual spec shape (`rules` is a `string[]`, not an object) rather than the journey doc description which was speculative. Temp dirs cleaned up via `fs.rmSync` in `finally` blocks.
**Session:** 2026-05-07

### Task 4.3 — Agent API hardening and frontend exposure ✓
**Output:** In-process `specCache` Map with 60s TTL on the spec endpoint; `invalidateSpecCache(projectId)` exported and called by the PATCH handler; `express-rate-limit` at 60 req/min with `skip: req.user` (authenticated owners bypass); `clearSpecCache()` and `specRateLimiter` exported for test reset; Agent API card added to `Stage4.tsx` (shown only when `savedProjectId` is set) with copy button; 5 new tests (cache hit, cache invalidation on PATCH, 404 non-caching, 429 after 60 requests, authenticated bypass).
**Key decisions:** `clearSpecCache()` separate from `invalidateSpecCache(id)` — tests need to clear all entries in `beforeEach` to prevent cross-test bleed; `optionalAuth` added before rate limiter on spec route so `req.user` is populated for authenticated callers; `specRateLimiter.resetKey(ip)` called in `beforeEach` so 61-request rate limit test doesn't exhaust limits for the rest of the suite.
**Session:** 2026-05-07

### Task 4.2 — Account settings page with CLI token ✓
**Output:** `GET /auth/cli-token` and `DELETE /auth/cli-token` backend routes; `findCliSessionByUserId` / `deleteCliSessionByUserId` session queries; `getCliToken(userId)` re-signs JWT with stored JTI (no schema change needed); `SettingsPage` at `/settings` (auth-guarded, redirects to `/login`); `CliTokenSection` with blur/reveal toggle, copy button, revoke-and-regenerate; settings link added to home page header.
**Key decisions:** `GET /auth/cli-token` re-signs the existing JTI rather than storing the raw JWT — cliAuth validates by JTI lookup so the re-signed token is functionally identical; "revoke and regenerate" is DELETE then re-GET (two calls) rather than a single atomic endpoint, keeping each endpoint's responsibility clear.
**Session:** 2026-05-07

### Task 4.1 — CLI package (`@ds-gen/cli`) ✓
**Output:** `cli/` package with `init` and `sync` commands; native fetch (Node 18+); `fs-extra` for file writing; `prompts` for interactive token entry; token resolution order: `--token` flag → `DS_GEN_TOKEN` env → `~/.ds-gen/config.json` → interactive prompt (saved to config); `DS_GEN_API_URL` env / `--api-url` flag for base URL override; `build` script compiles to CommonJS and `chmod +x` the entry point.
**Key decisions:** Standalone `tsconfig.json` (not extending base) because base uses `module: ESNext/bundler` which conflicts with CommonJS CLI output; TypeScript 4.1+ shebang preservation means `#!/usr/bin/env node` at top of `src/index.ts` survives compilation unchanged; `DS_GEN_API_URL` env var is essential for Playwright test which passes `http://localhost:3001` when running `execSync`.
**Session:** 2026-05-07
