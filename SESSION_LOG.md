# Session Log — Design System Generator

## Current State

**Phase:** 4 — CLI and Agent API — **Complete**
**Next task:** Phase 5 (TBD)
**What's built:** Phases 0–4 complete. CLI package (`@ds-gen/cli`) with `init`/`sync` commands, `/settings` page with CLI token management, agent API rate limiting (60 req/min) + 60s in-process cache, Agent API URL exposed on export page. 281/281 backend tests. 25/25 Playwright tests.
**Open questions:** None.

---


## 2026-05-04 — Task 3b.6: Playwright Phase 3b tests

**What was done:**

- Created `frontend/tests/e2e/phase-3b.spec.ts` with 5 tests:
  1. **Preset palette selection** — clicks "Teal & Coral", reads localStorage to assert `primaryHex=#0F766E` and `accentHex=#E44D26`, waits for preview ready, advances to Stage 3 and asserts primitives summary text
  2. **Custom color sync** — selects Custom tile, fills primary hex `#7C3AED`, asserts localStorage and color picker `input[type="color"]` value; enables Secondary row, fills `#059669`, asserts both values in localStorage
  3. **Functional chips per project type** — asserts all 4 chips have no "off" span on SaaS; switches to Marketing Site and asserts Error chip stays active, Warning/Success/Info chips gain "off" span
  4. **Landing page + auth redirect** — asserts h1 and "Start for free" link on unauthenticated `/`; clicks CTA → `/new`; registers+logs in; asserts `goto('/')` redirects to `/projects`; asserts "No projects yet" empty state
  5. **Project grid** — registers, creates project via `page.evaluate`, asserts card at `/projects`, clicks "New project" → `/new`, navigates back, asserts card still visible

**Decisions made:**

- `readFlowColor()` reads `localStorage['ds-gen-flow-config']` and returns `parsed.color` — the configStore writes the full flat `ProjectConfig` object (not Zustand-wrapped), so no `state` key needed
- Functional chips use `.bg-gray-50.rounded-full` (not `.bg-blue-50` used by scope chips) — safe unique selector
- `toBeAttached()` / `not.toBeAttached()` rather than `toBeVisible()` because the "off" span is conditionally rendered (not just hidden) in the functional chip

**Verification:**
- `tsc --noEmit` in `frontend/`: zero errors
- `npx playwright test phase-3b`: 5/5 passing (8.1s)
- `npx playwright test`: 21/21 passing (12.8s)

---


## 2026-05-04 — Task 3b.5: Unified dev startup

**What was done:**

- Installed `concurrently@^9.2.1` as a root devDependency
- Added `"dev"` script to root `package.json`: `concurrently --names 'frontend,preview' 'npm run dev --workspace=frontend' 'npm run dev --workspace=preview-sandbox'`
- Added `"build"` script to root `package.json`: `npm run build --workspace=frontend && npm run build --workspace=preview-sandbox`

**Decisions made:**

- Root `npm run dev` starts frontend on its default port (5173) — not 5299. Port 5299 is the Playwright test port, specified by `playwright.config.ts` webServer section via `--port 5299`. These are different use cases.
- No changes to `playwright.config.ts`, frontend `package.json`, or `vite.config.ts` needed

**Verification:**
- `npm run dev` starts both Vite servers within 8s; frontend responds 200 on 5173, preview responds 302 on 5180
- Output prefixed with `[frontend]` and `[preview]`
- Killing the root process terminates both children

---


## 2026-05-04 — Task 3b.4: Landing page and routing

**What was done:**

- Created `frontend/src/components/landing/LandingPage.tsx`: full-viewport hero with wordmark, h1, sub-headline, "Start for free" (→ `/new`) and "Sign in" (→ `/login`) CTAs; features section with 3 blurbs (color generation, component tokens, agent API)
- Updated `frontend/src/App.tsx`: added `RootRoute` component (checks auth state, redirects to `/projects` when authenticated, renders `LandingPage` when not); added `/projects` route → `<HomePage />`; wildcard `*` → `<Navigate to="/" replace />`
- Updated `frontend/src/components/ProjectPage.tsx`: `<Link to="/">` → `<Link to="/projects">`
- Updated `frontend/src/components/auth/LoginPage.tsx`: `navigate('/')` → `navigate('/projects')`
- Updated `frontend/src/components/auth/ClaimPrompt.tsx`: both `navigate('/')` calls → `navigate('/projects')`
- Updated `frontend/tests/e2e/phase-1.spec.ts`: `waitForURL('/')` and `toHaveURL('/')` → `/projects`
- Updated `frontend/tests/e2e/phase-1b.spec.ts`: `waitForURL('/')` → `/projects`
- Updated `frontend/tests/e2e/phase-2.spec.ts`: test 1.2 chip selector narrowed to `.bg-blue-50` (avoids counting functional color chips); test 1.3 renamed and updated to click "Forest & Gold" palette preset instead of "Warm & Approachable" color direction
- Updated `frontend/tests/e2e/phase-3.spec.ts`: `waitForURL('/')` in `apiRegisterVerifyBrowserLogin` helper and claim test → `/projects`; "Warm & Approachable" click → `getByRole('button', { name: /Forest & Gold/i })`

**Decisions made:**

- `RootRoute` renders nothing during `isLoading` to prevent landing page flash for authenticated users
- Scope chip selector `.inline-flex.rounded-full` had to be narrowed to `.inline-flex.rounded-full.bg-blue-50` because `Stage1FunctionalColors` also renders `inline-flex rounded-full` chips (with `bg-gray-50`)
- Most test failures were stale server reuse (wrong env vars) — killing servers before running tests is critical

**Verification:**
- `tsc --noEmit` in `frontend/`: zero errors
- `eslint` on changed files: zero errors
- `cd frontend && npx playwright test`: 16/16 passing

---


## 2026-05-04 — Task 3b.3: Preview accuracy and token summary colors

**What was done:**

- Created `frontend/src/vite-env.d.ts`: declares `ImportMetaEnv` with `VITE_PREVIEW_SANDBOX_URL?: string` so the env var is typed
- Created `frontend/.env.example`: documents `VITE_PREVIEW_SANDBOX_URL=http://localhost:5180`
- Updated `frontend/src/components/preview/SystemPreview.tsx`: `READY_TIMEOUT_MS` 3000 → 8000; replaced hardcoded `src="http://localhost:5180"` with `src={PREVIEW_URL}` where `PREVIEW_URL = import.meta.env.VITE_PREVIEW_SANDBOX_URL ?? 'http://localhost:5180'`
- Updated `preview-sandbox/src/generatePreviewTokens.ts`: removed `COLOR_DIRECTION_HEX` lookup — now uses `config.color.primaryHex` directly (always set by preset or custom input); added secondary/accent scale generation (conditional on config hex presence); imported `deriveFunctionalColors` from `@pipeline/palette/functional` and generates CSS vars for all active functional roles (`--color-error-*`, `--color-warning-*`, etc.)
- Updated `preview-sandbox/src/SystemPreviewLayout.tsx`: `SHADE_KEYS` expanded to all 19 values (50–950 in 50-step increments); extracted `ColorScaleRow` component (takes `label` + `varPrefix`); added conditional `Secondary` and `Accent` scale rows; added functional color rows for each active role (derived from `config.color.functionalColors?.enabled` ?? `PROJECT_TYPE_FUNCTIONAL[config.projectType]`); shade labels reduced to `8px` font to fit 19 swatches
- Updated `frontend/src/components/flow/Stage3TokenSummary.tsx`: added `primitives.colors` to `primTokens` (before spacing/radii/shadows/type entries) so all color shades appear in the expanded list; modified token row renderer to detect hex values and show a small colored circle swatch alongside the value

**Decisions made:**

- `generatePreviewTokens.ts` now just uses `config.color.primaryHex` — previously it had a `COLOR_DIRECTION_HEX` fallback for `source: 'generated'` configs, but since `primaryHex` is always present in the schema, the fallback was never needed and the two could diverge
- Functional color rows in the preview are computed from the same `PROJECT_TYPE_FUNCTIONAL` defaults as the backend — no API call needed; the CSS vars are set by `generatePreviewTokens` so rows render correctly as long as the sandbox receives the config

**Verification:**
- `tsc --noEmit` in `frontend/`: zero errors
- `tsc --noEmit` in `preview-sandbox/`: zero errors
- `npx eslint` on changed frontend files: zero errors
- `cd backend && npm test`: 276/276 pass

---

## 2026-05-04 — Task 3b.2: Stage 1 palette UI

**What was done:**

- Added `setColor(partial: Partial<ColorConfig>)` action to `configStore.ts` — shallow-merges into `config.color` and persists to localStorage
- Created `Stage1PaletteSelector.tsx`: 7 preset tiles in a 2-column grid using `PALETTE_PRESETS` from `@ds-gen/types`; each tile shows color dot swatches (primary, secondary, accent), name, and description; "Custom" tile clears `paletteId` and sets source to `'provided'`; selected tile has blue ring
- Created `Stage1BrandColors.tsx`: `ColorRow` for required Primary (always shown), `OptionalColorRow` for Secondary and Accent (checkbox toggle + row when enabled); each row has a native `<input type="color">` swatch (visually hidden, label wraps a colored span) and a synced hex text field; text field validates on blur and reverts to last committed value if invalid; changing any color when source is `'preset'` automatically clears `paletteId` and sets source to `'provided'`; `useEffect` syncs drafts when preset selection changes the store
- Created `Stage1FunctionalColors.tsx`: compact chip row showing all 4 roles (error/warning/success/info) with active/inactive state derived from `projectType` defaults or `config.color.functionalColors.enabled`; Customize disclosure (same `<details>` pattern as component scope) with per-role enable checkbox and override color picker; clearing an override reverts to "derived from palette"
- Rewrote `Stage1BrandAssets.tsx`: now renders `<Stage1PaletteSelector />`, `<Stage1BrandColors />`, and the typography inputs (always visible, labeled optional); removed the old "Starting fresh" / "I have brand assets" toggle entirely
- Updated `Stage1.tsx`: added `<Stage1FunctionalColors />` between brand assets and mode select

**Decisions made:**

- Typography section is always visible (no more "I have brand assets" toggle) — with the new palette selector, all users set brand colors; typefaces are secondary and clearly labeled optional
- Color picker is a visually hidden `<input type="color">` wrapped in a styled `<label>` — avoids OS-inconsistent picker chrome while still using the native color chooser
- `clearPresetIfNeeded` pattern in `Stage1BrandColors`: only clears paletteId when source is already 'preset', avoiding redundant store writes for custom-mode users

**Verification:**
- `tsc --noEmit` in `frontend/`: zero errors
- `npx eslint` on changed files: zero errors

---

## 2026-05-04 — Task 3b.1: Color data model and pipeline

**What was done:**

- Extended `packages/types/src/config.ts`: added `FunctionalColorRole = 'error' | 'warning' | 'success' | 'info'`; added `FunctionalColorsConfig` interface (`enabled`, `overrides`); added `paletteId?: string` and `functionalColors?: FunctionalColorsConfig` to `ColorConfig`; added `'preset'` to `ColorSource`; added corresponding Zod schemas (`FunctionalColorRoleSchema`, `FunctionalColorsConfigSchema`); updated `ColorConfigSchema`
- Created `packages/types/src/presets.ts`: `PalettePreset` interface and `PALETTE_PRESETS` array with 7 named presets (Cobalt & Ember, Forest & Gold, Violet & Slate, Rose & Navy, Teal & Coral, Amber & Indigo, Slate Monochrome)
- Updated `packages/types/src/index.ts`: exported all new types and values
- Rebuilt `packages/types` (`npm run build`): clean
- Created `backend/src/pipeline/palette/functional.ts`: `deriveFunctionalColors(config, projectType)` — determines active roles from `config.functionalColors.enabled` if set, else from project type defaults (saas/mobile → all 4, marketing → error only); aliases `info → primary` when primary hue is within 30° of 220°, `warning → accent` when accent hue is within 30° of 35°; for close brand colors (≤30° hue distance) seeds from brand hex; otherwise generates adapted scale (canonical seed with chroma blended 20% toward brand avg using HCL)
- Updated `backend/src/pipeline/tokens/primitives.ts`: imports and calls `deriveFunctionalColors`; merges result into `colors` map
- Updated `backend/src/pipeline/tokens/semantic.ts`: renamed module-level constants to `FALLBACK_RED/GREEN/AMBER/BLUE`; `resolveColorTokens` reads `primitives.colors.error/success/warning/info` with fallback to constants; destructive action token always uses `FALLBACK_RED`
- Updated `backend/src/pipeline/docs/decisions.ts`: guards on `color.paletteId` — uses palette name in rationale and config block if present, else falls back to `colorDirection` logic
- Updated `backend/src/pipeline/docs/agent-spec.ts`: `deriveProjectName` uses first word of preset name when `paletteId` set; added `paletteId` to config snapshot
- Updated `backend/tests/pipeline/tokens/primitives.test.ts`: updated 3 color-key assertions to include functional scales; added 7 new tests in `generatePrimitives — functional colors` describe block

**Decisions made:**

- Functional colors on by project type (not opt-in): consistent with the decision that saas/mobile always need status colors; `functionalColors.enabled` only needed as an override
- Kept `FALLBACK_*` scales in `semantic.ts` rather than removing them: the destructive action token legitimately always uses red; feedback fallbacks ensure marketing projects (which only generate `error`) still produce valid `warning/success/info` semantic tokens
- `info` aliased to primary for DEFAULT_CONFIG (blue primary, hue ~217°): avoids generating a second nearly-identical blue scale; 276 tests confirm the aliasing works correctly

**Verification:**
- `tsc --noEmit` in `packages/types/`: zero errors
- `tsc --noEmit` in `backend/`: zero errors
- `cd backend && npm test`: 276/276 pass (7 new tests)

---

## Phase 4 archive

Phase 4 session entries are archived at `logs/phase-4.md`.

---

## Phase 3b archive

Phase 3b session entries are archived at `logs/phase-3b.md`.

---

## Phase 3 archive

Phase 3 session entries are archived at `logs/phase-3.md`.

---

## Phase 2 archive

Phase 2 session entries are archived at `logs/phase-2.md`.

---

## Phase 1b archive

Phase 1b session entries are archived at `logs/phase-1b.md`.

---

## Phase 1 archive

Phase 1 session entries are archived at `logs/phase-1.md`.

---

## 2026-05-02 — Task 1.7: Phase 1 Playwright tests

**What was done:**

- Updated `packages/types/tsconfig.json`: removed `emitDeclarationOnly: true` (replaced with `declaration: true`) so `npm run build` emits both `.js` and `.d.ts` files. Built the types package. This was needed because `tsx src/server.ts` resolves `@ds-gen/types` via node_modules, which requires compiled JS in `dist/` — previously only declaration files existed.
- Updated `frontend/playwright.config.ts`: configured `webServer` for both backend (port 3001, `npx tsx src/server.ts` with test env vars) and frontend (port 5299, `npm run dev -- --port 5299`); `baseURL: 'http://localhost:5299'`
- Wrote `frontend/tests/e2e/phase-1.spec.ts`: 3 tests:
  1. Register → verify email → login → home: uses `page.route()` to intercept the register response and capture `X-Verification-Token`; calls `POST /auth/verify-email` via standalone `request` fixture (no browser session); logs in via form; asserts `/` URL
  2. Login with wrong password → error message: fills form with non-existent credentials; asserts "Invalid credentials" visible
  3. Unauthenticated redirect: navigates to `/`, asserts redirect to `/login`

**Decisions made:**

- Used port 5299 (not 5173) for playwright's dedicated test frontend server. Port 5173 was already in use by another dev app, causing `reuseExistingServer` to latch onto the wrong server and load a completely different login page.
- Used `page.route('**/auth/register', ...)` instead of `page.on('response', ...)` to capture the verification token header. Both work, but `page.route()` intercepts before the response reaches the page, making it more reliable for async header capture.
- Used standalone `request` fixture (not `page.request`) for the verify-email API call — this keeps the verification session out of the browser context, so the login form test works correctly immediately after.
- Types package emits JS: the `emitDeclarationOnly` restriction was a carryover from early dev when only vitest (with its alias) ran the backend. Now that the Playwright webServer runs `tsx src/server.ts` directly, the types package needs compiled JS.

**Verification:**
- `npx playwright test phase-1`: 3/3 pass
- Backend: 251/251 pass
- `tsc --noEmit` in `backend/`, `frontend/`, `packages/types`: all clean

---

## 2026-05-02 — Task 1.6: Frontend stub

**What was done:**

- Created `frontend/index.html` — Vite entry point
- Created `frontend/src/index.css` — Tailwind v4 (`@import "tailwindcss"`)
- Created `frontend/src/main.tsx` — React entry, mounts `<App />` in StrictMode
- Created `frontend/src/App.tsx` — React Router v7 `BrowserRouter` with 5 routes: `/`, `/login`, `/register`, `/new`, `/projects/:id`
- Created `frontend/src/api/client.ts` — `apiRequest<T>()` fetch wrapper with `credentials: 'include'`, `ApiResponseError` class; relative paths (proxy handles routing to backend)
- Created `frontend/src/api/auth.ts` — `login`, `register`, `logout`, `getMe`
- Created `frontend/src/api/projects.ts` — `listProjects`, `getProject` with `Project` type importing `ProjectConfig` from `@ds-gen/types`
- Created `frontend/src/store/configStore.ts` — `useConfigStore` with `ProjectConfig`, `setConfig`, `resetConfig`, inline `DEFAULT_CONFIG`
- Created `frontend/src/store/uiStore.ts` — `useUIStore` with `currentStage: 0|1|2|3`, `isSaving`, `lastSavedAt`
- Created `frontend/src/store/userStore.ts` — `useUserStore` with `user`, `isLoading`, `fetchUser()` calling `getMe()`
- Created `frontend/src/components/auth/LoginPage.tsx` — email + password form, calls `login()` → `fetchUser()` → navigate to `/`; shows API error message on failure
- Created `frontend/src/components/auth/RegisterPage.tsx` — name + email + password form, calls `register()`; on success shows "Check your email" message; shows API error on failure
- Created `frontend/src/components/home/HomePage.tsx` — fetches user on mount; redirects to `/login` if unauthenticated; fetches and displays project list
- Created `frontend/src/components/home/ProjectGrid.tsx` — renders project cards or "No projects yet" empty state
- Created stub pages `NewProjectPage.tsx` and `ProjectPage.tsx`
- Updated `frontend/vite.config.ts`: added proxy for `/auth`, `/projects`, `/api` → `http://localhost:3001` so `SameSite=Strict` cookies work (requests appear same-origin to the browser)

**Decisions made:**

- Vite proxy instead of `VITE_API_URL` env var: the backend sets `SameSite=Strict` on session cookies, which browsers won't send cross-origin. The proxy makes all requests same-origin (localhost:5173), so cookies are included automatically.
- No `any` types: `apiRequest<T>` uses generics; `res.json()` is cast via `as Promise<T>` (type assertion, not `any`); all store interfaces are fully typed
- `DEFAULT_CONFIG` defined inline in `configStore.ts` — not imported from backend, since the frontend should be self-contained. Values match `backend/src/pipeline/palette/defaults.ts`.
- `userStore.fetchUser()` swallows errors and sets `user = null` — this is the correct behavior for 401 Unauthorized responses from `GET /auth/me`

**Verification:**
- `tsc --noEmit` in `frontend/`: zero errors
- `npm run dev` in `frontend/`: starts successfully (Vite 6.4.2)

---

## 2026-05-02 — Task 1.5: Export and agent API endpoints

**What was done:**

- Modified `src/services/auth.ts`: `signJwt` and `issueSession` now accept optional `expiresIn` parameter; added `issueCliToken(userId)` which issues a 30-day session with `device_hint = 'cli'`
- Created `src/middleware/cliAuth.ts`: reads `Authorization: Bearer <token>`, verifies JWT, checks session exists with `device_hint = 'cli'`, attaches `req.user`
- Created `src/api/generate.ts`: two exported routers — `projectExportRouter` (mounted at `/projects`, all routes behind `requireAuth`) and `agentRouter` (mounted at `/api/v1/systems`). Routes: POST `/:id/export`, GET `/:id/export.zip`, GET `/:projectId/spec` (no auth), GET `/:projectId/manifest` (cliAuth)
- Updated `src/api/auth.ts`: added `POST /auth/cli-token` route (requireAuth) that calls `issueCliToken` and returns the raw JWT
- Updated `src/app.ts`: mounted `projectExportRouter` at `/projects` and `agentRouter` at `/api/v1/systems`
- Created `tests/globalSetup.ts`: runs migrations once before all test files (vs. per-file `beforeAll`) to prevent concurrent migration lock conflicts
- Updated `vitest.config.ts`: added `globalSetup` and `fileParallelism: false` (API integration tests all write to the same DB; concurrent TRUNCATE in `beforeEach` would wipe data across files)
- Removed `beforeAll` migration + `execSync` import from `auth.test.ts`, `projects.test.ts`, `generate.test.ts`
- Wrote 12 integration tests in `tests/api/generate.test.ts`

**Decisions made:**

- `agentRouter` spec endpoint has no auth — public by design; manifest endpoint uses `cliAuth` middleware (Bearer token, not cookie) since CLI tools don't maintain cookie sessions
- ZIP test uses a custom `.parse()` callback to collect raw binary in supertest — `res.body` is `{}` for `application/zip` since superagent has no built-in parser for that MIME type
- `fileParallelism: false` in vitest config: API test files share one DB; without this, concurrent `TRUNCATE` calls in `beforeEach` across files wipe each other's test data mid-test
- `globalSetup` explicitly passes `DATABASE_URL` in the child process env since `test.env` variables are not set during globalSetup execution

**Verification:**
- `npm test -- api/generate`: 12/12 pass
- Full suite: 251/251 pass (16 test files)
- `tsc --noEmit`: zero errors
- `eslint src`: zero errors

---

## 2026-05-02 — Task 1.4: Project CRUD API

**What was done:**

- Added `ProjectRow` to `src/db/types.ts`
- Created `src/db/queries/projects.ts`: insertProject, findProjectsByUserId, findProjectById, findProjectByUserIdAndSlug, updateProject (dynamic SET clause), deleteProject
- Created `src/services/project.ts`: createProject (Zod validation, throws with `code='INVALID_CONFIG'`), listProjects, getProject, updateProjectById (deep-merge then validate), deleteProjectById. Helpers: toKebabCase, generateUniqueSlug (4-char alphanumeric suffix on collision), deepMerge (recursive)
- Created `src/api/projects.ts`: all 5 routes behind `requireAuth`. Service layer returns discriminant strings ('forbidden', 'invalid', null) mapped to 403/400/404 in route handlers
- Updated `src/app.ts`: mounted `/projects` router
- Wrote 16 integration tests in `tests/api/projects.test.ts`

**Decisions made:**

- Ownership enforced in service layer by comparing `row.user_id !== userId`, returns 'forbidden' discriminant — route layer maps to 403. Cleaner than throwing and consistent with getProject/deleteProjectById pattern.
- PATCH deep-merges partial config with existing stored config, then runs full Zod validation on the merged result. Returns 'invalid' discriminant (→ 400) if validation fails.
- `findProjectById` re-exported from service module so generate routes (Task 1.5) can use it.

**Verification:**
- `npm test -- api/projects`: 16/16 pass
- Full suite: 239/239 pass
- `tsc --noEmit`: zero errors
- `eslint src`: zero errors

---

## 2026-05-02 — Task 1.3: Auth service and API routes

**What was done:**

- Installed `cookie-parser` + `@types/cookie-parser`
- Created `src/db/types.ts`: TypeScript row types for all DB tables
- Created `src/db/queries/users.ts`: findByEmail, findById, insertUser, setEmailVerified, updatePasswordHash
- Created `src/db/queries/sessions.ts`: session CRUD + email verification token CRUD + password reset token CRUD
- Created `src/services/email.ts`: stub email sender (no-op in NODE_ENV=test; logs in dev)
- Created `src/services/auth.ts`: register, verifyEmail, login, logout, getMe, forgotPassword, resetPassword, issueSession. Error codes on thrown errors for route-layer mapping. Login uses dummy bcrypt hash comparison to prevent timing attacks on non-existent emails.
- Created `src/types/express.d.ts`: Express Request augmentation to add `req.user`
- Created `src/middleware/auth.ts`: `requireAuth` middleware — reads session cookie, verifies JWT, checks jti in user_sessions, updates last_active_at, attaches `req.user`
- Created `src/api/auth.ts`: 7 route handlers. In NODE_ENV=test, register endpoint emits `X-Verification-Token` header for Playwright use
- Updated `src/app.ts`: added cookie-parser, mounted auth router at `/auth`
- Updated `vitest.config.ts`: added `env` with DATABASE_URL (test DB), JWT_SECRET, JWT_EXPIRES_IN
- Wrote 21 integration tests in `tests/api/auth.test.ts`. Tests run `npm run migrate:up` via execSync in beforeAll (so tsx handles TypeScript migrations), truncate tables in beforeEach

**Decisions made:**

- node-pg-migrate's `runner()` can't load `.ts` migration files when called from within vitest (no tsx require hook). Using `execSync('npm run migrate:up')` in beforeAll instead — this goes through tsx and handles TypeScript correctly.
- Login endpoint returns generic "Invalid credentials" for both wrong password AND non-existent email. Dummy bcrypt hash ensures both code paths take the same ~100ms.
- `X-Verification-Token` response header is only set in NODE_ENV=test — same approach planned for Playwright in Task 1.7.
- email_verification_tokens table has no `created_at` column (per dev plan schema) — test helper queries without ORDER BY.

**Verification:**
- `npm test -- api/auth`: 21/21 pass
- Full suite: 223/223 pass (14 test files)
- `tsc --noEmit`: zero errors
- `eslint src`: zero errors

---

## 2026-05-02 — Task 1.2: Database setup and migrations

**What was done:**

- Installed `pg` and `@types/pg`
- Created `backend/src/db/connection.ts`: `pool` singleton (`pg.Pool`) and `query<T>()` helper
- Created `backend/src/db/migrations/001_initial_schema.ts`: `up`/`down` using node-pg-migrate's `MigrationBuilder` API. Creates all 6 tables (users, email_verification_tokens, password_reset_tokens, user_sessions, projects, project_snapshots) with all indexes from the spec
- Created `backend/migrate.ts`: tsx-runnable runner using `node-pg-migrate`'s programmatic `runner()` API. Reads `DATABASE_URL` from env, runs `up` or `down` per CLI arg
- Added `migrate:up` and `migrate:down` npm scripts
- Updated `backend/src/api/health.ts` to run `SELECT 1` against the pool; returns `{ status: 'ok', db: 'ok' }` on success, `{ status: 'degraded', db: 'error' }` on pool error
- Created `ds_gen_test` and `ds_gen_dev` databases locally
- Verified: `migrate:up` creates all 7 rows in `\dt` (6 tables + pgmigrations); `migrate:down` drops all back to pgmigrations only

**Decisions made:**

- Used node-pg-migrate's programmatic `runner()` API instead of the CLI, because the CLI requires ts-node for TypeScript migration files whereas the runner inherits tsx's module resolution naturally
- Top-level `await runner(...)` in migrate.ts caused a CJS error with tsx; changed to `void runner(...).catch(...)` to avoid the issue without needing ESM
- Health endpoint uses try/catch rather than pool events — simpler, synchronous from the handler's perspective, and the error case returns HTTP 200 (degraded) rather than 500

**Verification:**
- `npm run migrate:up` (DATABASE_URL=postgresql://johnlivornese@localhost/ds_gen_test): all 6 tables created
- `npm run migrate:down`: all 6 tables dropped, only pgmigrations remains
- `npm test`: 202/202 pass
- `tsc --noEmit`: zero errors
- `eslint src`: zero errors

---

## 2026-05-02 — Task 1.1: Express server and environment setup

**What was done:**

- Added `cors`, `helmet`, `dotenv` to production dependencies; `@types/cors`, `supertest`, `@types/supertest` to devDependencies
- Created `backend/src/api/health.ts`: `GET /health` returns `{ status: 'ok' }` (db field added in Task 1.2)
- Created `backend/src/app.ts`: `createApp()` factory with Helmet, CORS (origin from `FRONTEND_URL` env), JSON body parser, health router mounted at `/health`
- Created `backend/src/server.ts`: loads dotenv, creates app, listens on `PORT` (default 3001)
- Updated `package.json` dev script to `tsx watch src/server.ts`
- `.env.example` was already present with all required vars — no changes needed
- Wrote `backend/tests/api/health.test.ts` using supertest

**Decisions made:**

- `createApp()` factory (no side effects) is what tests import; `server.ts` is the process entry point that calls `app.listen()`. Tests never import `server.ts`.
- CORS `origin` reads from `process.env.FRONTEND_URL` — undefined in test environment, which is fine (supertest requests don't require CORS).

**Verification:**
- `tsc --noEmit`: zero errors
- `eslint backend/src`: zero errors
- `npm test`: 202/202 pass (13 test files)

---

## Phase 0 archive

Phase 0 session entries are archived at `logs/phase-0.md`.

---

## 2026-05-01 — Phase 0 housekeeping

**What was done:**

- Ran full test suite to confirm pass state: 201/201 tests passing, 12 test files
- Verified `tsc --noEmit` in `packages/types` and `backend`: zero errors
- Verified `eslint backend/src`: zero errors
- Confirmed `tasks/phase-0.md` has all acceptance criteria marked `[x]`
- Wrote `docs/phase-0-retro.md`
- Updated `docs/design-system-plan-summary.md`: Phase 0 → Complete, Phase 1 → Not started ← current
- Updated `docs/user-journeys.md`: added Phase 1 coverage entries (Journey 3.1.1–3.1.4 and 3.2.1)
- Authored `tasks/phase-1.md`: 7 tasks (server setup, DB, auth, project CRUD, export/agent API, frontend stub, Playwright)
- Updated `AGENTS.md` Patterns section with 7 patterns established in Phase 0
- Archived this session log to `logs/phase-0.md`

**Decisions made:**

- Phase 1 task structure follows the dev plan strictly. Auth is one task (1.3) covering the full auth service + routes together since they're tightly coupled. Frontend stub is one task (1.6) since it's minimal.
- Phase 1 Playwright approach: `NODE_ENV=test` causes the auth service to include the verification token in the registration response header (`X-Verification-Token`). This avoids mocking while still allowing automated e2e verification.
- User journeys update: added Phase 1 e2e coverage for register/verify/login flow (3.1.1–3.1.4) and home page empty state (3.2.1). Journey step 3.1.5 (project saved after account creation) is Phase 3 since it requires the creation flow from Phase 2.
- The agent API (5.1.1–5.1.4) stays listed as Phase 4 in the coverage table because Phase 4 is when the Playwright e2e test for it is written. Phase 1 has API integration tests for it, but those are `backend/tests/api/generate.test.ts`, not Playwright.

**What was not done:**
- No Phase 1 code — waiting for instruction to begin.
