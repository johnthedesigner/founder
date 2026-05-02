# Phase 1 — Backend and Auth

> **Status:** Not started
> **Depends on:** Phase 0 — Pipeline Foundation (complete)
> **Reference:** `docs/design-system-dev-plan.md` § Phase 1 — Backend and Auth

---

## Overview

Working Express server with auth, project CRUD, and generation endpoints. The pipeline from Phase 0 is wired to real API routes. A user can register, save a project, and download a ZIP via API. The frontend in Phase 1 is a minimal stub: login page, home page, and project list. No creation flow yet.

At the end of this phase: all API routes are implemented and tested, the database schema is live, auth flows work end-to-end, and the frontend stub loads with real data from the API.

---

## Tasks

### Task 1.1 — Express server and environment setup

> **Status:** `[ ]` Not started
> **Depends on:** None (Phase 1 starting point)

**What this task implements:**
The Express application scaffold: `app.ts` (middleware, route mounting), `server.ts` (listen), CORS, Helmet, JSON body parsing, the `/health` endpoint, and `backend/.env.example`. No database connection yet — that's Task 1.2.

**Files to create or modify:**
- `backend/src/app.ts` — Express app factory; mounts all routers; applies Helmet, CORS, JSON body parser
- `backend/src/server.ts` — Calls `app.listen(PORT)` from environment; not imported by tests
- `backend/src/api/health.ts` — `GET /health` handler
- `backend/.env.example` — Documents all required env vars (see Environment Variables section of dev plan)
- `backend/package.json` — Add `express`, `cors`, `helmet`, `dotenv` dependencies
- `backend/tsconfig.json` — Ensure `outDir`, `rootDir`, and `include` are correct for src/ (no changes if already correct)

**Acceptance criteria:**
- [ ] `GET /health` returns `{ status: 'ok' }` with HTTP 200 (database check is `'pending'` until Task 1.2 adds the connection)
- [ ] Server starts without error when `npm run dev` is run with valid env vars
- [ ] `tsc --noEmit` passes with zero errors
- [ ] `eslint src` passes with zero errors
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- Must not add any database connection logic — that's Task 1.2
- Must not implement any auth or project routes — those are Tasks 1.3 and 1.4

---

### Task 1.2 — Database setup and migrations

> **Status:** `[ ]` Not started
> **Depends on:** Task 1.1

**What this task implements:**
The Postgres connection module and the initial migration that creates all tables from the schema defined in `docs/design-system-dev-plan.md`. Uses `node-pg-migrate` for migration management.

**Schema:** Implement exactly the schema from `docs/design-system-dev-plan.md` § Database Schema:
- `users` (id, email, password_hash, display_name, email_verified, deleted_at, created_at)
- `email_verification_tokens` (id, user_id, token, expires_at, used_at)
- `password_reset_tokens` (id, user_id, token, expires_at, used_at)
- `user_sessions` (id, user_id, jti, device_hint, ip_address, last_active_at, created_at)
- `projects` (id, user_id, name, slug, config, last_exported_at, created_at, updated_at)
- `project_snapshots` (id, project_id, config, label, created_at) — created now, not used until a future version

All indexes from the schema must be included.

**Files to create or modify:**
- `backend/src/db/connection.ts` — `pg.Pool` singleton, exports `query()` helper and `pool`
- `backend/src/db/migrations/001_initial_schema.ts` — `up` function creates all tables and indexes; `down` function drops all tables in reverse dependency order
- `backend/src/api/health.ts` — Update health endpoint to query `SELECT 1` and return `{ status: 'ok', db: 'ok' }` on success, `{ status: 'degraded', db: 'error' }` on failure
- `backend/package.json` — Add `pg`, `node-pg-migrate`; add `@types/pg` to devDependencies
- `backend/.env.example` — Already created in 1.1; ensure `DATABASE_URL` and `TEST_DATABASE_URL` are documented

**Acceptance criteria:**
- [ ] `npm run migrate:up` runs the initial migration without error against `TEST_DATABASE_URL`
- [ ] `npm run migrate:down` fully reverts the migration (no tables remain except system tables)
- [ ] `GET /health` returns `{ status: 'ok', db: 'ok' }` when the database is reachable
- [ ] `GET /health` returns `{ status: 'degraded', db: 'error' }` (HTTP 200) when the database is unreachable — tested by temporarily pointing at a bad connection string
- [ ] `project_snapshots` table is created (even though it will not be used in V1)
- [ ] `tsc --noEmit` passes with zero errors
- [ ] `eslint src` passes with zero errors

**Must not do:**
- Must not use an ORM — raw `pg` queries only
- Must not add any application logic beyond database connectivity

---

### Task 1.3 — Auth service and API routes

> **Status:** `[ ]` Not started
> **Depends on:** Task 1.2

**What this task implements:**
The full auth system: registration, email verification, login, logout, password reset, JWT middleware. The email service is wired to the configured provider (`resend` or `sendgrid`); in test mode, use `nodemailer` with a test transport so emails can be intercepted by Playwright.

**Registration flow:**
1. Validate email format and password minimum length (12 chars)
2. Hash password with `bcrypt` (cost factor 12)
3. Insert user with `email_verified = false`
4. Generate 32-byte random token, insert into `email_verification_tokens` (24-hour expiry)
5. Send verification email via configured provider
6. Return 201 — no session issued yet

**Email verification flow:**
1. Look up token, check not used and not expired
2. Set `email_verified = true`, mark token used
3. Issue JWT — insert `user_sessions` record with `jti`
4. Return JWT in httpOnly cookie with `SameSite=Strict`

**Login flow:**
1. Find user by email, check `email_verified`
2. Compare password with bcrypt
3. Issue JWT session
4. Return JWT in httpOnly cookie

**JWT middleware:** On every authenticated request, verify the JWT, then check `jti` exists in `user_sessions`. Revoked sessions return 401. Update `last_active_at` on valid sessions.

**Files to create or modify:**
- `backend/src/services/auth.ts` — All auth logic (register, verifyEmail, login, logout, forgotPassword, resetPassword, issueSession, revokeSession)
- `backend/src/db/queries/users.ts` — User DB queries (findByEmail, insert, setEmailVerified)
- `backend/src/db/queries/sessions.ts` — Session DB queries (insert, findByJti, delete, updateLastActive)
- `backend/src/middleware/auth.ts` — JWT verification middleware; attaches `req.user` on success
- `backend/src/api/auth.ts` — Route handlers for all 7 auth endpoints
- `backend/src/app.ts` — Mount `/auth` router
- `backend/package.json` — Add `bcrypt`, `jsonwebtoken`, `cookie-parser`, `nodemailer`; add `@types/bcrypt`, `@types/jsonwebtoken`, `@types/cookie-parser`, `@types/nodemailer` to devDependencies
- `backend/tests/api/auth.test.ts` — Integration tests against TEST_DATABASE_URL

**Acceptance criteria:**
- [ ] `POST /auth/register`: creates user with `email_verified = false`, returns 201
- [ ] `POST /auth/register`: duplicate email returns 409
- [ ] `POST /auth/register`: password shorter than 12 chars returns 400 with error message
- [ ] `POST /auth/register`: invalid email format returns 400
- [ ] `POST /auth/verify-email`: valid token → user verified, session issued, JWT cookie set, returns 200
- [ ] `POST /auth/verify-email`: expired token returns 400
- [ ] `POST /auth/verify-email`: already-used token returns 400
- [ ] `POST /auth/verify-email`: non-existent token returns 400
- [ ] `POST /auth/login`: correct credentials + verified email → JWT cookie set, returns 200
- [ ] `POST /auth/login`: wrong password returns 401
- [ ] `POST /auth/login`: unverified email returns 403
- [ ] `POST /auth/logout`: deletes session row; subsequent authenticated request returns 401
- [ ] `GET /auth/me`: with valid session returns `{ user: { id, email, displayName } }`
- [ ] `GET /auth/me`: with deleted jti returns 401
- [ ] `POST /auth/forgot-password`: always returns 200 (no email enumeration), sends email if user exists
- [ ] `POST /auth/reset-password`: valid token → password updated, old token invalidated, returns 200
- [ ] JWT middleware populates `req.user` on authenticated routes
- [ ] `tsc --noEmit` passes with zero errors
- [ ] `eslint src` passes with zero errors
- [ ] `cd backend && npm test -- api/auth` passes

**Must not do:**
- Must not return different error messages for "email not found" vs "wrong password" on the login endpoint (prevents enumeration)
- Must not issue a session on registration — only after email verification

---

### Task 1.4 — Project CRUD API

> **Status:** `[ ]` Not started
> **Depends on:** Task 1.3

**What this task implements:**
All five project routes plus the project service layer. Config validation uses the `ProjectConfigSchema` Zod schema from `packages/types`. Ownership is enforced on every route — a user cannot access another user's project.

**Slug generation:** kebab-case from project name, unique per user. On collision, append a 4-character alphanumeric suffix.

**PATCH deep-merge:** The `PATCH /projects/:id` endpoint accepts a partial `ProjectConfig`. Deep-merge the provided partial with the existing stored config, then validate the merged result. Return 400 if validation fails.

**Files to create or modify:**
- `backend/src/services/project.ts` — Project business logic (create, list, get, update, delete, generateSlug)
- `backend/src/db/queries/projects.ts` — Project DB queries (insert, findByUserId, findById, update, delete)
- `backend/src/api/projects.ts` — Route handlers for all 5 project routes
- `backend/src/app.ts` — Mount `/projects` router behind auth middleware
- `backend/tests/api/projects.test.ts` — Integration tests

**Acceptance criteria:**
- [ ] `POST /projects`: valid config → project created with generated slug, returns 201 with full project object
- [ ] `POST /projects`: config missing `color.primaryHex` returns 400 with Zod error details
- [ ] `POST /projects`: config with invalid projectType returns 400
- [ ] `POST /projects`: unauthenticated returns 401
- [ ] `GET /projects`: returns array of the authenticated user's projects; empty array when none exist
- [ ] `GET /projects`: unauthenticated returns 401
- [ ] `GET /projects/:id`: own project returns full project object including stored config
- [ ] `GET /projects/:id`: another user's project returns 403
- [ ] `GET /projects/:id`: non-existent id returns 404
- [ ] `PATCH /projects/:id`: partial config update deep-merges with existing config, validates, returns updated project
- [ ] `PATCH /projects/:id`: invalid merge result (e.g. setting projectType to an invalid value) returns 400
- [ ] `PATCH /projects/:id`: another user's project returns 403
- [ ] `DELETE /projects/:id`: own project deleted, returns 204
- [ ] `DELETE /projects/:id`: another user's project returns 403
- [ ] Slug uniqueness: two projects with the same name for the same user get different slugs
- [ ] `tsc --noEmit` passes with zero errors
- [ ] `eslint src` passes with zero errors
- [ ] `cd backend && npm test -- api/projects` passes

---

### Task 1.5 — Export and agent API endpoints

> **Status:** `[ ]` Not started
> **Depends on:** Task 1.4

**What this task implements:**
The generation endpoints that wire Phase 0's `generate()` pipeline to real HTTP routes. The agent API is public (no auth). The CLI manifest endpoint requires a CLI auth token (a long-lived session with `device_hint = 'cli'`).

**Export endpoint (`POST /projects/:id/export`):** Calls `generate(project.config)`, updates `last_exported_at`, returns the full file manifest as JSON.

**ZIP endpoint (`GET /projects/:id/export.zip`):** Calls `generate(project.config)`, calls `assembleZip(files)`, streams the ZIP buffer. Sets `Content-Disposition: attachment; filename="{project-slug}.zip"`.

**Agent API (`GET /api/v1/systems/:projectId/spec`):** No auth required. Looks up the project by ID (any user's project), calls `generate(project.config)`, returns the `agent-spec.json` content parsed as JSON. Returns 404 for non-existent projects. Rate limiting is added in Phase 4 — not in this task.

**CLI manifest (`GET /api/v1/systems/:projectId/manifest`):** Requires a CLI auth token. Returns the full file manifest as `{ files: GeneratedFile[] }`.

**CLI auth token issuance:** Add `POST /auth/cli-token` — authenticated endpoint that creates a `user_sessions` row with `device_hint = 'cli'` and returns the raw JWT. This token is long-lived (30 days). Add to the auth service.

**Files to create or modify:**
- `backend/src/api/generate.ts` — Route handlers for export, ZIP, agent API, CLI manifest
- `backend/src/middleware/cliAuth.ts` — Middleware that checks for `Authorization: Bearer <cli-token>` header and validates against `user_sessions` with `device_hint = 'cli'`
- `backend/src/api/auth.ts` — Add `POST /auth/cli-token` handler
- `backend/src/app.ts` — Mount generate routes; mount `/api/v1` prefix routes
- `backend/tests/api/generate.test.ts` — Integration tests

**Acceptance criteria:**
- [ ] `POST /projects/:id/export`: returns `{ files: GeneratedFile[] }` with all 12+ required paths
- [ ] `POST /projects/:id/export`: updates `last_exported_at` on the project record
- [ ] `POST /projects/:id/export`: another user's project returns 403
- [ ] `POST /projects/:id/export`: unauthenticated returns 401
- [ ] `GET /projects/:id/export.zip`: returns a valid ZIP (parseable by jszip) containing all required file paths
- [ ] `GET /projects/:id/export.zip`: response has correct `Content-Disposition` header with project slug
- [ ] `GET /api/v1/systems/:projectId/spec`: no auth required; returns parsed agent-spec JSON with all required keys (`version`, `projectId`, `projectName`, `generatedAt`, `config`, `tokens`, `components`, `rules`)
- [ ] `GET /api/v1/systems/:projectId/spec`: non-existent project returns 404
- [ ] `GET /api/v1/systems/:projectId/manifest`: valid CLI token returns `{ files: GeneratedFile[] }`
- [ ] `GET /api/v1/systems/:projectId/manifest`: no token returns 401
- [ ] `POST /auth/cli-token`: authenticated user receives a long-lived JWT token
- [ ] `tsc --noEmit` passes with zero errors
- [ ] `eslint src` passes with zero errors
- [ ] `cd backend && npm test -- api/generate` passes

**Must not do:**
- Must not add rate limiting or in-process caching to the agent API — that's Phase 4

---

### Task 1.6 — Frontend stub

> **Status:** `[ ]` Not started
> **Depends on:** Task 1.3 (auth API must exist for login/register to call)

**What this task implements:**
The frontend application scaffold: Vite + React + TypeScript + Tailwind. Zustand stores. React Router. Four routes: home, login, register, new (stub), project (stub). Login and register pages are functional. Home page lists projects from the API. No creation flow yet.

**Zustand stores (exact interfaces from dev plan):**
```typescript
// configStore.ts
interface ConfigStore {
  config: ProjectConfig
  setConfig: (partial: Partial<ProjectConfig>) => void
  resetConfig: () => void
}

// uiStore.ts
interface UIStore {
  currentStage: 0 | 1 | 2 | 3
  setStage: (stage: number) => void
  isSaving: boolean
  lastSavedAt: Date | null
}

// userStore.ts
interface UserStore {
  user: { id: string; email: string; displayName: string } | null
  isLoading: boolean
  fetchUser: () => Promise<void>
}
```

**API client:** A thin `frontend/src/api/client.ts` module that wraps `fetch` with base URL, credentials, and JSON serialization. No third-party HTTP client.

**Routes:**
- `/` — Home page: if authenticated, shows project grid (or empty state). If not authenticated, redirects to `/login`.
- `/login` — Login form (email + password). On success, fetches user and redirects to `/`.
- `/register` — Registration form (email + password + display name). On success, shows "Check your email" message.
- `/new` — Stub: shows "Creation flow coming soon" placeholder
- `/projects/:id` — Stub: shows "Project editor coming soon" placeholder

**Files to create or modify:**
- `frontend/` — Bootstrap with `npm create vite@latest frontend -- --template react-ts` if not already initialized
- `frontend/src/store/configStore.ts`
- `frontend/src/store/uiStore.ts`
- `frontend/src/store/userStore.ts`
- `frontend/src/api/client.ts`
- `frontend/src/api/auth.ts` — Auth API calls (login, register, logout, getMe)
- `frontend/src/api/projects.ts` — Project API calls (list, get)
- `frontend/src/components/home/HomePage.tsx`
- `frontend/src/components/home/ProjectGrid.tsx`
- `frontend/src/components/auth/LoginPage.tsx`
- `frontend/src/components/auth/RegisterPage.tsx`
- `frontend/src/App.tsx` — Router setup
- `frontend/src/main.tsx`

**Acceptance criteria:**
- [ ] `npm run dev` in `frontend/` starts the dev server without errors
- [ ] `tsc --noEmit` in `frontend/` passes with zero errors
- [ ] Login page: submitting valid credentials logs in the user, fetches user from `GET /auth/me`, redirects to home
- [ ] Login page: wrong credentials shows error message below the form
- [ ] Register page: submitting valid details calls `POST /auth/register` and shows "Check your email" message
- [ ] Register page: server-side validation error (e.g. email in use) shows the error message
- [ ] Home page: authenticated user sees their projects listed (or empty state "No projects yet")
- [ ] Home page: unauthenticated user is redirected to `/login`
- [ ] `/new` and `/projects/:id` routes load without crashing (stub content is acceptable)
- [ ] All three Zustand stores are typed correctly — `tsc --noEmit` enforces this
- [ ] No `any` types in store or API client files

**Must not do:**
- Must not implement any creation flow — that's Phase 2
- Must not add Playwright yet — that's Task 1.7
- Must not use shadcn/ui components for the auth pages — use only Tailwind utilities and plain HTML elements. (shadcn/ui is reserved for the creation flow builder UI in Phase 2)

---

### Task 1.7 — Phase 1 Playwright tests

> **Status:** `[ ]` Not started
> **Depends on:** Tasks 1.3, 1.6 (auth routes and frontend login page must exist)

**What this task implements:**
End-to-end Playwright tests for the Phase 1 user journeys. Tests run against a real local server with a test database. Email verification is intercepted using nodemailer's test transport or a seeded test token — no real email is sent.

**Approach for email verification in tests:** During test runs (`NODE_ENV=test`), the auth service writes the verification token to a well-known response header (`X-Verification-Token`) on the `POST /auth/register` response. This is only emitted when `NODE_ENV=test` — never in production or staging.

**Files to create or modify:**
- `frontend/tests/e2e/phase-1.spec.ts` — Phase 1 Playwright tests
- `frontend/playwright.config.ts` — Configure `baseURL`, `testDir`, browser settings
- `frontend/package.json` — Add `@playwright/test` to devDependencies

**Test cases:**
1. **Register → verify email → login → home:** Navigate to `/register`, fill form, submit. Extract verification token from response header. POST to `/auth/verify-email` with the token. Navigate to `/login`, fill credentials, submit. Assert home page loads and URL is `/`.
2. **Login with wrong password → error:** Navigate to `/login`. Fill in wrong password. Submit. Assert error message is visible. Assert URL has not changed.
3. **Unauthenticated redirect:** Navigate to `/` without being logged in. Assert redirect to `/login`.

**Acceptance criteria:**
- [ ] `cd frontend && npx playwright test phase-1` runs all three tests and all pass
- [ ] Tests run against a real local server (not mocked)
- [ ] Verification token extraction (`X-Verification-Token`) only works in `NODE_ENV=test` — a test of the production code path, not a mock
- [ ] Journey steps 3.1.1–3.1.4 and 3.2.1 are covered (as noted in `docs/user-journeys.md`)
- [ ] `SESSION_LOG.md` updated with session entry and new Current State block

**Must not do:**
- Must not intercept network requests to mock backend responses — tests must run against real server + real database
- Must not add `X-Verification-Token` behavior outside `NODE_ENV=test`

---

## Phase 1 completion checklist

Before starting Phase 2, verify all of the following:

- [ ] All tasks above marked `[x]` complete
- [ ] `cd backend && npm test` — all tests pass
- [ ] `cd frontend && npm test` — all unit tests pass (if any)
- [ ] `cd frontend && npx playwright test` — all Phase 1 e2e tests pass
- [ ] `tsc --noEmit` in `packages/types`, `backend`, and `frontend` — all pass with zero errors
- [ ] `eslint src` in `backend` and `frontend` — zero errors
- [ ] `GET /health` returns `{ status: 'ok', db: 'ok' }` with the database running
- [ ] `POST /auth/register` → `POST /auth/verify-email` → `POST /auth/login` flow works end-to-end
- [ ] `GET /projects/:id/export.zip` returns a valid ZIP containing all pipeline output
- [ ] `GET /api/v1/systems/:projectId/spec` returns agent spec JSON with all required fields
- [ ] Phase retrospective written to `docs/phase-1-retro.md`
- [ ] `docs/user-journeys.md` updated for Phase 2 scope
- [ ] `docs/design-system-plan-summary.md` updated to mark Phase 1 Complete
- [ ] Session log archived to `logs/phase-1.md`
