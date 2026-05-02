# Session Log — Phase 1: Backend and Auth

## State at end of Phase 1

**Phase:** 1 — Backend and Auth
**All tasks:** 1.1–1.7 complete
**Tests:** 251 backend (vitest) + 3 Playwright e2e
**What's built:** Full Express backend with Postgres, auth system, project CRUD, export/agent API, CLI token endpoint. Frontend stub with login, register, home page. Playwright e2e covering register→verify→login, wrong-password error, unauthenticated redirect.

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
