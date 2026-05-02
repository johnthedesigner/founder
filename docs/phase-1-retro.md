# Phase 1 Retrospective — Backend and Auth

**Phase dates:** 2026-05-02
**Tasks completed:** 1.1 – 1.7 (all 7)
**Tests at end of phase:** 251 backend (vitest) + 3 Playwright e2e

---

## What was built

### Backend (Tasks 1.1 – 1.5)
- Express server with `createApp()` factory, Helmet, CORS, cookie-parser
- Postgres schema: 6 tables (users, email verification tokens, password reset tokens, user sessions, projects, project snapshots) via a single `node-pg-migrate` TypeScript migration
- Full auth system: register → email verification → login → logout → forgot password → reset password. JWT sessions with `jti` stored in `user_sessions`. `requireAuth` middleware. Timing-safe login for non-existent users via dummy bcrypt hash.
- Project CRUD: create (Zod validation, slug generation), list, get, PATCH (deep-merge + re-validate), delete. Ownership enforced at service layer via discriminant return values (`'forbidden'`, `null`, `'invalid'`).
- Export endpoints: `POST /projects/:id/export` (JSON manifest), `GET /projects/:id/export.zip` (ZIP stream via JSZip), `GET /api/v1/systems/:projectId/spec` (public agent spec), `GET /api/v1/systems/:projectId/manifest` (CLI-token-gated), `POST /auth/cli-token` (30-day CLI session).

### Frontend (Task 1.6)
- Vite + React 19 + TypeScript + Tailwind v4. React Router v7 in library mode.
- Three Zustand v5 stores: `configStore`, `uiStore`, `userStore`.
- Thin `apiRequest<T>()` fetch wrapper with `credentials: 'include'`. Vite proxy for same-origin cookie delivery.
- Login page, register page ("Check your email" post-submit), home page (project list / empty state, auth redirect), stub pages for `/new` and `/projects/:id`.

### Tests (Task 1.7)
- Vitest integration tests across 16 test files (251 total). API tests use `globalSetup` for a single migration run + `fileParallelism: false` to prevent concurrent TRUNCATE interference.
- 3 Playwright tests: register → verify → login → home, wrong-password error, unauthenticated redirect.

---

## Key decisions

**`createApp()` factory for Express.** Tests import the factory, not the server entry. This avoids `app.listen()` side effects in tests and is simpler than port negotiation.

**Discriminant return values instead of thrown errors in service layer.** `getProject()` returns `ProjectResponse | null | 'forbidden'` rather than throwing. The route layer maps these to HTTP status codes with a plain `if` chain. Thrown errors with `.code` properties are reserved for validation failures that cross service boundaries (e.g., `INVALID_CONFIG`).

**Timing-safe login via dummy bcrypt hash.** Non-existent email paths use a precomputed dummy hash in `bcrypt.compare()` so the response time is indistinguishable from a wrong-password path. Prevents user enumeration via timing.

**`SameSite=Strict` cookies + Vite proxy.** The frontend proxies all API paths to the backend, making requests appear same-origin to the browser. This lets cookies work without relaxing `SameSite` to `Lax` or `None`.

**`X-Verification-Token` header in `NODE_ENV=test`.** No email mocking library needed. The register endpoint emits the token as a response header only in test mode. Playwright captures it via `page.route()` intercept and calls verify-email directly via the `request` fixture (standalone context, no browser session side-effects).

**`globalSetup` + `fileParallelism: false` for vitest.** Three API test files all write to the same test database. Running them in parallel caused TRUNCATE calls in one file's `beforeEach` to delete data created by another file's running test. `fileParallelism: false` serializes them cleanly.

**`@ds-gen/types` needs compiled JS for the server.** The vitest alias (`@ds-gen/types` → TS source) masked that `tsx src/server.ts` resolves via node_modules → `dist/index.js`. Changed the types package tsconfig from `emitDeclarationOnly: true` to `declaration: true` and ran `npm run build` to emit JS files.

---

## What was hard

**Concurrent migration lock in vitest.** The original approach had each test file call `execSync('npm run migrate:up')` in its own `beforeAll`. When vitest ran files in parallel, all three API test files tried to run migrations simultaneously. node-pg-migrate's advisory lock caused the second and third to fail with "Another migration is already running." The fix (globalSetup + fileParallelism: false) was straightforward once the root cause was clear, but required understanding that vitest runs each file in a forked process by default.

**Port collision in Playwright.** The default port 5173 was already occupied by a different running app. `reuseExistingServer: true` silently latched onto the wrong server, so tests ran against a completely different login page. The error context screenshots revealed the mismatch immediately. Fixed by using a dedicated port (5299) for Playwright's test frontend server.

**`@ds-gen/types` dist had no JS files.** This was invisible during all previous work because vitest redirected the import to TypeScript source. Only became apparent when Playwright's `webServer` ran `tsx src/server.ts` directly. The tsconfig audit of `packages/types/` revealed `emitDeclarationOnly: true`. One-line fix + rebuild.

---

## What worked well

**The `X-Verification-Token` approach.** No email mock infrastructure, no fake SMTP server, no test-only seeding endpoint. The header is emitted only in test mode and the test reads it via a route intercept. Simple and invisible in production.

**Discriminant-typed service returns.** The `'forbidden' | 'invalid' | null | ProjectResponse` pattern for service functions is easy to type, easy to test, and keeps route handlers thin. No try/catch needed for expected error states.

**Vitest `env` config for test database.** Setting `DATABASE_URL` in `vitest.config.ts` rather than a `.env.test` file means the test database is configured once in the test runner, applies to all test files automatically, and doesn't interfere with the dev `.env`.

**Deep-merge then validate for PATCH.** The `PATCH /projects/:id` deep-merge approach (merge partial config into stored config, then run full Zod validation on the result) is robust. Partial updates that would produce invalid configs fail with 400. No partial validation rules needed.

---

## Patterns to carry forward

- Playwright e2e tests use `page.route()` to intercept responses and capture test-only headers
- Vite proxy for same-origin cookie delivery in development
- `globalSetup` + `fileParallelism: false` for vitest integration tests sharing a database
- Discriminant return values from service functions; route layer maps to HTTP codes
- `@ds-gen/types` must be built (JS output) before running `tsx src/server.ts` directly
