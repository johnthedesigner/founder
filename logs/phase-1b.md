# Session Log Archive — Phase 1b: Anonymous Projects and Claim

> Archived from SESSION_LOG.md on 2026-05-02

---

## 2026-05-02 — Task 1b.5: Playwright Phase 1b tests

**What was done:**

- Fixed `ClaimPrompt.tsx`: moved auto-navigate-to-`/` from render body into a `useEffect` (calling `navigate` during render is a React anti-pattern)
- Fixed `vite.config.ts`: `/projects` proxy was forwarding full browser navigations to the backend (returning raw JSON). Added `bypass` function — requests with `Accept: text/html` (browser page loads) get served `index.html`; fetch/XHR API calls (no text/html) get proxied to the backend
- Wrote `frontend/tests/e2e/phase-1b.spec.ts` — 4 tests:
  1. `anonymous project page shows owner controls when ownerToken is in localStorage` (6.1.2–6.1.3)
  2. `anonymous project page is read-only without ownerToken in localStorage` (6.1.4)
  3. `clearing localStorage makes project page read-only on reload` (6.3.1)
  4. `register → login → claim anonymous project → appears in home grid` (6.2.2–6.2.3)

**Decisions made:**

- `seedLocalStorage` helper navigates to `/login` first to establish the app origin, then `page.evaluate` to write the Zustand persist format (`{ state: { entries: [...] }, version: 0 }`) before the target page loads. This ensures the Zustand store hydrates from the seeded entry on the next full-page navigation.
- `page.addInitScript` was rejected: it would re-seed localStorage on every subsequent navigation including the reload in test 3, preventing the clear-localStorage test from working correctly.
- `request` fixture is used for all backend API calls in e2e tests (no browser session / cookies). Browser context for UI assertions is entirely separate.

**Verification:**
- `npx playwright test` — 7/7 pass (3 Phase 1 + 4 Phase 1b)
- All Phase 1 tests unaffected (0 regressions)
- `tsc --noEmit` in `frontend/`: zero errors

---

## 2026-05-02 — Task 1b.4: Frontend — anonymous store + public project page + claim prompt

**What was done:**

- Created `frontend/src/store/anonymousStore.ts`: Zustand store with `persist` middleware, persisted to `localStorage['ds-gen-anonymous']`; state: `entries: AnonymousEntry[]`; actions: `addEntry` (dedup by id), `removeEntry`, `clearAll`, `getToken(id)`
- Updated `frontend/src/api/client.ts`: `apiRequest` accepts optional `options?: { headers?: Record<string, string> }`; merges custom headers with the base `Content-Type` header
- Rewrote `frontend/src/api/projects.ts`: `Project` type updated (`userId: string | null`, `canEdit: boolean` added); `ownerTokenHeader(id)` helper reads from `anonymousStore`; `createProject` stores ownerToken in anonymousStore on anonymous creation; `getProject`, `updateProject`, `deleteProject` send `X-Owner-Token` header if present in store; new `claimProject(id, ownerToken)` calls `POST /projects/:id/claim`
- Rewrote `frontend/src/components/ProjectPage.tsx`: fetches project publicly, shows read-only mode with "Sign in to edit" link when `canEdit` is false, shows "You own this" badge when true; no auth redirect
- Created `frontend/src/components/auth/ClaimPrompt.tsx`: lists anonymous entries from store; "Claim" calls `claimProject` and removes entry from store; "Skip" calls `removeEntry`; "Continue to dashboard" navigates to `/`
- Updated `frontend/src/components/auth/LoginPage.tsx`: after login + `fetchUser()`, checks `anonymousEntries.length`; if non-empty, renders `ClaimPrompt` in-place before navigating to `/`

**Decisions made:**

- ClaimPrompt placed in `LoginPage.tsx` (not `RegisterPage.tsx`): claiming requires an authenticated session, which only exists after login — not during registration. This also handles returning users who have anonymous projects.
- `ownerTokenHeader` reads `useAnonymousStore.getState()` directly (imperative, outside React) — correct pattern for use in non-hook API functions.
- `ProjectPage` shows a raw config JSON dump as a placeholder — the actual editor is Phase 2.

**Verification:**
- `tsc --noEmit` in `frontend/`: zero errors
- `tsc --noEmit` in `backend/`: zero errors

---

## 2026-05-02 — Task 1b.3: Public project GET + claim endpoint + types update

**What was done:**

- Updated `packages/types/src/api.ts`: `ProjectResponse.userId` → `string | null`; added `canEdit: boolean`; added `AnonymousCreateProjectResponse` interface; exported from index; rebuilt dist
- Updated `backend/src/db/queries/projects.ts`: `updateProject` now accepts `userId?` and `ownerToken?: string | null` for the claim operation; uses `'ownerToken' in data` check to distinguish "unset" from "set to null"
- Updated `backend/src/services/project.ts`: added `canEdit: boolean` to `ProjectResponse`; `rowToResponse(row, canEdit)` now takes explicit `canEdit` param; added `computeCanEdit(row, auth?)` helper; changed `getProject` signature to `(projectId, auth?)` returning `ProjectResponse | null` (no more `'forbidden'`); all callers of `rowToResponse` pass explicit `canEdit: true`; added `claimProject(projectId, ownerToken, newUserId)`
- Updated `backend/src/api/projects.ts`: `GET /:id` changed from `requireAuth` to `optionalAuth`; passes `{ userId, ownerToken }` auth object to `getProject`; added `POST /:id/claim` route (requireAuth + X-Owner-Token header required)
- Updated `backend/src/api/generate.ts`: updated `getProject` calls to new `{ userId }` signature; replaced `result === 'forbidden'` checks with `!result.canEdit`
- Added 13 new tests: 6 for public GET with canEdit variants, 6 for claim endpoint, 1 for slug uniqueness with anonymous projects

**Decisions made:**

- `computeCanEdit` lives in the service (not the route) alongside the ownership model. The route passes raw request auth headers; the service does the comparison against the DB row. Clean separation — the route never touches `row.owner_token` directly.
- `claimProject` returns `'forbidden'` for non-existent project IDs (not `null` → 404). A bad actor shouldn't learn whether a project ID exists from a failed claim attempt.
- `ownerToken` in `updateProject` uses `'ownerToken' in data` to differentiate "don't touch" (key absent) from "set to NULL" (key present with value null). This is the standard JS pattern for nullable update columns.

**Verification:**
- `npm test -- api/projects`: 34/34 pass
- Full suite: 269/269 pass (16 test files)
- `npm run build` in `packages/types/`: clean
- `tsc --noEmit` in `packages/types/`, `backend/`, `frontend/`: all zero errors

---

## 2026-05-02 — Task 1b.2: Anonymous project creation + owner token auth

**What was done:**

- Updated `db/queries/projects.ts`: `insertProject` accepts nullable `userId` and optional `ownerToken`; added `findProjectByOwnerToken(token)`
- Updated `services/project.ts`: added `EditAuth` discriminant type (`{ type: 'user'; userId }` | `{ type: 'token'; ownerToken }`); `createProject` now takes nullable `userId` and generates a 64-char hex `owner_token` when `userId` is null; return type is `{ project, ownerToken: string | null }`; `updateProjectById` and `deleteProjectById` take `EditAuth` instead of `userId`; `hasEditAccess(row, auth)` helper handles both auth paths
- Added `optionalAuth` middleware to `middleware/auth.ts`: attempts cookie auth, sets `req.user` if valid, always calls `next()` — never returns 401
- Rewrote `api/projects.ts`: removed router-level `requireAuth`; `POST /` uses `optionalAuth`; `GET /` and `GET /:id` keep `requireAuth`; `PATCH /:id` and `DELETE /:id` use `optionalAuth` + `extractEditAuth` helper (returns 401 if neither cookie nor header present, 403 if present but wrong)
- Updated `tests/api/projects.test.ts`: changed POST unauthenticated test to assert 201+ownerToken; added 7 new owner-token tests; added anonymous slug test

**Decisions made:**

- `optionalAuth` rather than a dedicated `ownerTokenAuth` middleware: the `X-Owner-Token` is checked in the service layer against the specific project row, not as a general request-level concern. This avoids a redundant DB lookup (middleware + service) and keeps auth logic co-located with the ownership check.
- `extractEditAuth` returns null (→ 401) when no credentials are provided at all; the service returns 'forbidden' (→ 403) when credentials are provided but wrong. This gives the caller correct HTTP semantics.
- Anonymous projects share no slug namespace — the partial index allows duplicate slugs for null user_id, so `generateUniqueSlug` skips collision checking for anonymous callers.

**Verification:**
- `npm test -- api/projects`: 25/25 pass
- Full suite: 260/260 pass (16 test files)
- `tsc --noEmit` in `backend/`: zero errors

---

## 2026-05-02 — Task 1b.1: Migration — nullable user_id + owner_token

**What was done:**

- Created `backend/src/db/migrations/002_anonymous_projects.ts`: drops NOT NULL on `projects.user_id`, replaces CASCADE FK with SET NULL FK, replaces the composite unique index on `(user_id, slug)` with a partial unique index `WHERE user_id IS NOT NULL`, adds `owner_token TEXT` column with unique index
- Updated `backend/src/db/types.ts`: `ProjectRow.user_id` is now `string | null`; `owner_token: string | null` added
- Updated `backend/src/services/project.ts`: `ProjectResponse.userId` changed to `string | null` to match the updated row type

**Decisions made:**

- Partial unique index (`WHERE user_id IS NOT NULL`) allows anonymous projects to coexist with any slug value without colliding, while still enforcing per-user slug uniqueness for authenticated projects.
- FK changed from CASCADE to SET NULL: deleting a user account orphans their projects rather than cascading the delete. Matches the CodePen model where content outlives the account.

**Verification:**
- `npm run migrate:up` / `migrate:down` / `migrate:up` round-trip: clean
- `\d projects`: user_id nullable, owner_token column present, correct indexes
- `npm test`: 251/251 pass
- `tsc --noEmit` in `backend/`: zero errors
