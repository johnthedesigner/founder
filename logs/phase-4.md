# Phase 4 Session Log Archive

Archived from `SESSION_LOG.md` on 2026-05-07.

---

## 2026-05-07 — Task 4.4: Playwright Phase 4 tests

**What was done:**

- Created `frontend/tests/e2e/phase-4.spec.ts` with 4 tests:
  1. **CLI init writes files** — registers+verifies+logs in, creates project, issues CLI token via `page.evaluate`, runs `node cli/dist/index.js init --project=<id>` in a temp dir via `execSync` with `DS_GEN_TOKEN` + `DS_GEN_API_URL` env vars, asserts `tokens/`, `components/`, `docs/` each have at least one file, asserts `.design-system-meta.json` contains correct `projectId` and a string `generatedAt`
  2. **CLI sync updates generatedAt** — runs init, reads meta, waits 1.1s, runs sync, asserts `new Date(metaAfter.generatedAt) > new Date(metaBefore.generatedAt)`
  3. **Agent API GET /spec returns valid shape** — creates anonymous project via `request.post`, GETs spec, asserts 200, asserts `tokens.colorCount > 0`, `components` is non-empty array with string `name`, `rules` is non-empty `string[]`
  4. **Agent API 404 for unknown project** — GETs spec for `00000000-0000-0000-0000-000000000000`, asserts 404
- Added `workers: 1` to `frontend/playwright.config.ts`
- Updated `docs/user-journeys.md`: added note that 4.2.1–4.2.2 (settings page) is manual verification only

**Decisions made:**

- `workers: 1` — parallel workers sharing one backend DB caused intermittent race on user registration (phase-1 and phase-4 tests running concurrently); sequential execution eliminates this without any test logic changes
- `rules` tested as `string[]` (not object with `tokenUsage`) — journey doc (step 5.1.3) was speculative; actual pipeline generates `rules` as an array of strings
- Temp dirs cleaned up via `fs.rmSync` in `finally` blocks — ensures no leftover dirs even on test failure
- Anonymous project creation (`POST /projects` without auth) works for test 3 — matches Phase 1b design

**Verification:**
- `tsc --noEmit` in `frontend/`: zero errors
- `cd frontend && npx playwright test phase-4`: 4/4 pass
- `cd frontend && npx playwright test`: 25/25 pass

---

## 2026-05-07 — Task 4.3: Agent API hardening and frontend exposure

**What was done:**

- Installed `express-rate-limit` (already in backend `package.json`; hoisted to root `node_modules`)
- Updated `backend/src/api/generate.ts`: added `specCache: Map<string, { spec: object; cachedAt: number }>` with 60s TTL; exported `invalidateSpecCache(id)` and `clearSpecCache()`; added `specRateLimiter` (60 req/min, skips authenticated users) exported for test access; spec route now runs `optionalAuth` then `specRateLimiter` then checks cache before calling `generate()`; caches result on first generation; added `clearSpecCache()` export
- Updated `backend/src/api/projects.ts`: imported `invalidateSpecCache` from `generate.ts`; calls it after a successful PATCH so next spec request regenerates
- Updated `frontend/src/components/flow/Stage4.tsx`: added `agentApiUrl` computed from `savedProjectId`; added "Agent API" card (shown only when project is saved) with code block showing the URL and a copy button; copy/paste state tracked with `agentCopied`
- Created `backend/tests/api/agent-cache.test.ts`: 5 tests:
  1. Cache hit: spy on `pipeline.generate`, confirm called once for two spec requests
  2. Cache invalidation: PATCH triggers re-generation on next spec request
  3. 404 non-caching: unknown project returns 404
  4. Rate limit: 61 requests → last one is 429
  5. Auth bypass: authenticated request succeeds even after limit exhausted

**Decisions made:**

- `clearSpecCache()` separate from `invalidateSpecCache(id)`: tests need to clear all entries in `beforeEach` to prevent bleed between test cases
- `optionalAuth` placed before `specRateLimiter` on spec route so `req.user` is populated when the `skip` function runs
- `specRateLimiter.resetKey(LOOPBACK_IP)` in `beforeEach`: prevents 61-request rate limit test from exhausting the limit for other tests in the suite
- Rate limit test sends 60 requests first (all cached after #1) then verifies 429 on #61 — runs in ~500ms thanks to caching

**Verification:**
- `tsc --noEmit` in `backend/`: zero errors
- `tsc --noEmit` in `frontend/`: zero errors
- `cd backend && npm test`: 281/281 pass (17 test files, 5 new tests)

---

## 2026-05-07 — Task 4.2: Account settings page with CLI token

**What was done:**

- Added `findCliSessionByUserId(userId)` and `deleteCliSessionByUserId(userId)` to `backend/src/db/queries/sessions.ts`
- Added `getCliToken(userId)` and `revokeCliToken(userId)` to `backend/src/services/auth.ts`: `getCliToken` finds existing CLI session and re-signs a JWT with the stored JTI (or issues a new session if none exists); `revokeCliToken` deletes the CLI session row
- Added `GET /auth/cli-token` and `DELETE /auth/cli-token` to `backend/src/api/auth.ts`; `POST /auth/cli-token` kept for backward compat
- Added `getCliToken()` and `revokeCliToken()` to `frontend/src/api/auth.ts`
- Created `frontend/src/components/settings/CliTokenSection.tsx`: fetches token on mount; blur/reveal toggle via Tailwind `blur-sm` class; copy-to-clipboard with "Copied!" flash; "Revoke and regenerate" calls DELETE then re-fetches GET; command snippet block with `init` and `sync` examples; error state
- Created `frontend/src/components/settings/SettingsPage.tsx`: auth-guarded (redirects to `/login` if not authenticated); "← Projects" back link; renders `CliTokenSection`
- Updated `frontend/src/App.tsx`: added `/settings` route
- Updated `frontend/src/components/home/HomePage.tsx`: added "Settings" link in header alongside user email

**Decisions made:**

- `getCliToken` re-signs with the existing JTI rather than storing the raw JWT — `cliAuth` validates by JTI lookup so the re-signed token is functionally identical; no schema change needed
- "Revoke and regenerate" is two frontend calls (DELETE + GET) rather than a single endpoint — each route does one thing; the GET re-issues automatically since no CLI session exists after DELETE
- Token display uses CSS `blur-sm` on a `<code>` element rather than `input type="password"` — text is selectable once revealed without changing input type

**Verification:**
- `tsc --noEmit` in `backend/`: zero errors
- `tsc --noEmit` in `frontend/`: zero errors
- `cd backend && npm test`: 276/276 pass

---

## 2026-05-07 — Task 4.1: CLI package (`@ds-gen/cli`)

**What was done:**

- Updated `cli/package.json`: added `fs-extra`, `prompts` dependencies; `@types/fs-extra`, `@types/node`, `@types/prompts` devDependencies; fixed `bin` entry to `dist/index.js`; added `build: tsc && chmod +x dist/index.js` script
- Replaced `cli/tsconfig.json`: standalone config (not extending base) with `"module": "commonjs"`, `"moduleResolution": "node"`, `"target": "ES2020"` — base tsconfig uses `ESNext/bundler` which is incompatible with CLI CommonJS output
- Created `cli/src/config.ts`: `loadConfig()`/`saveConfig()` for `~/.ds-gen/config.json` using `fs-extra.readJson`/`writeJson`
- Created `cli/src/manifest.ts`: `fetchManifest(projectId, token, apiUrl)` using native fetch; maps 404 → "Project not found", 401 → "Invalid or expired CLI token", other errors → "Server error: N"
- Created `cli/src/commands/init.ts`: parses `--project`, `--token`, `--api-url` flags; token resolution: flag → `DS_GEN_TOKEN` env → config → interactive prompt (saves to config); fetches manifest; writes all files with `fs-extra.ensureDir`; writes `.design-system-meta.json`
- Created `cli/src/commands/sync.ts`: reads `.design-system-meta.json`; same token resolution; fetches manifest; overwrites files; updates `generatedAt` timestamp
- Updated `cli/src/index.ts`: shebang `#!/usr/bin/env node` (preserved by TypeScript compiler); routes `init`/`sync` subcommands; prints usage for unknown commands (exit 1)

**Decisions made:**

- Standalone tsconfig (no extends) because `tsconfig.base.json` uses `module: ESNext` and `moduleResolution: bundler` — these cause `require()` to fail at runtime in Node
- TypeScript 4.1+ preserves shebang comments in output, so `#!/usr/bin/env node` at top of `src/index.ts` compiles through to `dist/index.js`
- `DS_GEN_API_URL` env var added (not in original task spec) — required for Task 4.4 Playwright test which runs `execSync` with this env var pointing to `http://localhost:3001`
- Token is saved to config on first interactive prompt; not re-prompted on subsequent runs

**Verification:**
- `cd cli && npx tsc --noEmit`: zero errors
- `npm run build`: compiles 5 files, shebang preserved, file executable
- `node dist/index.js` (no args): usage printed, exit 0
- `node dist/index.js unknown-cmd`: usage printed, exit 1
- `node dist/index.js init` (no --project): "Error: --project required", exit 1
- `init --project=<valid-id>` with env token+api-url: wrote 33 files to temp dir + meta
- `sync` in temp dir with meta: updated all 33 files, updated `generatedAt`
- `init --project=00000000-0000-0000-0000-000000000000`: "Error: Project not found", exit 1
