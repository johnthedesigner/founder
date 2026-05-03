# Phase 1b — Anonymous Projects and Claim

> **Status:** Not started
> **Depends on:** Phase 1 complete (all tasks marked `[x]`, 251 backend tests + 3 Playwright tests passing)
> **Reference:** `docs/design-system-plan-summary.md` § Phase 1b — Anonymous Projects and Claim

---

## Overview

Projects are saved and publicly shareable before any account is created — the CodePen model. A user completes the creation flow, hits "Save project," and immediately receives a permanent URL. An `owner_token` (stored in the browser) grants edit access from the same browser. When the user later creates an account, a claim prompt appears and transfers ownership. Projects whose tokens have been lost remain publicly viewable but become read-only.

This phase has four tasks: a database migration, backend API changes, a `@ds-gen/types` update, and frontend wiring. All existing Phase 1 behavior continues to work — authenticated project creation is unchanged.

---

## Tasks

### Task 1b.1 — Migration: nullable user_id + owner_token

> **Status:** `[x]` Complete
> **Session:** 2026-05-02
> **Depends on:** none (Phase 1 complete)

**What this task implements:**
A new migration that relaxes `projects.user_id` to nullable, changes its delete behavior to `SET NULL` (so deleting a user orphans their projects rather than deleting them), and adds an `owner_token` column used exclusively for anonymous projects.

**Files to create or modify:**
- `backend/src/db/migrations/002_anonymous_projects.ts` — new migration
- `backend/src/db/types.ts` — update `ProjectRow` to reflect nullable `user_id` and new `owner_token` field

**Migration `up` must:**
1. Drop the existing `NOT NULL` constraint on `projects.user_id`
2. Drop the existing FK constraint on `projects.user_id` (named `projects_user_id_fkey` by Postgres convention) and re-add it as `REFERENCES users(id) ON DELETE SET NULL`
3. Drop the existing unique index `idx_projects_slug` on `(user_id, slug)` — it cannot enforce uniqueness once `user_id` is nullable in the standard way; replace with a partial unique index: `CREATE UNIQUE INDEX idx_projects_slug ON projects (user_id, slug) WHERE user_id IS NOT NULL`
4. Add column `owner_token TEXT` with a unique index `idx_projects_owner_token`

**Migration `down` must** reverse all of the above (re-add NOT NULL, revert FK, revert index, drop column).

**Updated `ProjectRow`:**
```typescript
export interface ProjectRow {
  id: string
  user_id: string | null        // was: string
  name: string
  slug: string
  config: ProjectConfig
  owner_token: string | null    // new
  last_exported_at: Date | null
  created_at: Date
  updated_at: Date
}
```

**Acceptance criteria:**
- [ ] `npm run migrate:up` applies the migration without error
- [ ] `npm run migrate:down` reverses it without error
- [ ] `npm run migrate:up` again after a down re-applies cleanly
- [ ] `\d projects` in psql shows `user_id` as nullable, `owner_token` column present
- [ ] An INSERT into `projects` with `user_id = NULL` succeeds
- [ ] Two rows with `user_id = NULL` and the same `slug` can coexist (partial index allows this)
- [ ] Two rows with the same non-null `user_id` and same `slug` still fail (uniqueness enforced)
- [ ] `tsc --noEmit` in `backend/` passes
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- Must not change any column on tables other than `projects`
- Must not modify migration 001 — always add a new migration file

---

### Task 1b.2 — Anonymous project creation + owner token auth

> **Status:** `[x]` Complete
> **Session:** 2026-05-02
> **Depends on:** Task 1b.1

**What this task implements:**
`POST /projects` no longer requires authentication. Unauthenticated callers create an anonymous project; the response includes `ownerToken` (returned once, never again). A new `ownerTokenAuth` middleware accepts an `X-Owner-Token` header as an alternative to the session cookie for PATCH and DELETE. Existing authenticated callers are unaffected.

**Files to create or modify:**
- `backend/src/db/queries/projects.ts` — update `insertProject` to accept nullable `userId` and optional `ownerToken`; add `findProjectByOwnerToken(token)`
- `backend/src/services/project.ts` — update `createProject`: if no authenticated user, generate `owner_token` via `crypto.randomBytes(32).toString('hex')` and create with `user_id = null`; return the token in the service result; update ownership checks in `updateProjectById` and `deleteProjectById` to accept either `userId` match or `ownerToken` match
- `backend/src/middleware/ownerTokenAuth.ts` — new middleware; reads `X-Owner-Token` header; looks up project by token (using `projectId` from `req.params.id`); if found, attaches `req.projectOwnership = { type: 'token' }` to req; if not found, calls `next()` without attaching (let route handler decide)
- `backend/src/api/projects.ts` — update `POST /` to not require `requireAuth`; extract `req.user?.id` if present, else null; call `createProject` with the appropriate userId; if `ownerToken` is present in the result, include it in the response; update `PATCH /:id` and `DELETE /:id` to accept either `requireAuth` + ownership OR valid `X-Owner-Token`
- `backend/tests/api/projects.test.ts` — add tests for all new behaviors (see below)

**`createProject` service result change:**
```typescript
type CreateProjectResult =
  | { project: ProjectResponse; ownerToken: string }   // anonymous
  | { project: ProjectResponse; ownerToken: null }      // authenticated
```

**API response for anonymous creation:**
```json
{
  "project": { "id": "...", "userId": null, ... },
  "ownerToken": "a3f9..."
}
```
For authenticated creation, `ownerToken` is omitted from the response entirely (not `null`).

**PATCH / DELETE auth logic:**
Check in this order:
1. If `req.user` is set (cookie auth) and `project.user_id === req.user.id` → authorized
2. Else if `X-Owner-Token` header matches `project.owner_token` → authorized
3. Else → 403

**New tests to add to `projects.test.ts`:**
- `POST /projects` without cookie → 201 with `project` and `ownerToken` in response
- `POST /projects` without cookie, check DB: `user_id IS NULL`, `owner_token` is set
- `PATCH /projects/:id` with correct `X-Owner-Token` header → 200
- `PATCH /projects/:id` with wrong token → 403
- `PATCH /projects/:id` with no auth and no token → 401
- `DELETE /projects/:id` with correct `X-Owner-Token` → 200
- `DELETE /projects/:id` with no auth and no token → 401
- Authenticated `POST /projects` still returns 201 with no `ownerToken` field

**Acceptance criteria:**
- [ ] All new tests pass
- [ ] All existing `projects.test.ts` tests still pass (0 regressions)
- [ ] `POST /projects` with no session cookie returns `{ project, ownerToken }` in the response body
- [ ] `ownerToken` is exactly 64 hex characters
- [ ] `PATCH /projects/:id` with `X-Owner-Token: <correct token>` returns 200
- [ ] `PATCH /projects/:id` with a wrong or missing token returns 403 or 401 as appropriate
- [ ] `npm test` in `backend/` passes
- [ ] `tsc --noEmit` in `backend/` passes
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- Must not return `ownerToken` in any response other than the initial `POST /projects` for anonymous creation — once created, the token is never re-transmitted by the server
- Must not require the `X-Owner-Token` header for `GET /projects/:id` — that endpoint is public (Task 1b.3)
- Must not change the `POST /auth/cli-token` or any auth endpoints

---

### Task 1b.3 — Public project GET + types update + claim endpoint

> **Status:** `[x]` Complete
> **Session:** 2026-05-02
> **Depends on:** Task 1b.2

**What this task implements:**
`GET /projects/:id` becomes public (no auth required) and adds a `canEdit` boolean to its response. A new `POST /projects/:id/claim` endpoint transfers an anonymous project to an authenticated account. The `@ds-gen/types` package is updated to reflect nullable `userId` and the new `canEdit` field.

**Files to create or modify:**
- `packages/types/src/api.ts` — update `ProjectResponse`: `userId: string | null`; add `canEdit: boolean`; add `AnonymousCreateProjectResponse` interface (extends `ProjectResponse` with `ownerToken: string`); rebuild with `npm run build`
- `backend/src/api/projects.ts` — remove `requireAuth` from `GET /:id`; compute `canEdit` in the route handler (true if `req.user?.id === project.user_id` OR `req.headers['x-owner-token'] === project.owner_token`); include `canEdit` in response; add `POST /:id/claim` route
- `backend/src/services/project.ts` — add `claimProject(projectId, ownerToken, newUserId)`: validates `project.owner_token === ownerToken`; validates `project.user_id IS NULL`; calls `updateProject` to set `user_id = newUserId` and `owner_token = null`; returns `'already-claimed' | 'forbidden' | ProjectResponse`
- `backend/src/db/queries/projects.ts` — update `updateProject` to support setting `user_id` and clearing `owner_token`; add `findProjectByOwnerToken(token)` if not added in 1b.2
- `backend/tests/api/projects.test.ts` — add tests for public GET and claim

**`POST /projects/:id/claim` route:**
- Requires `requireAuth` (must be logged in to claim)
- Reads `X-Owner-Token` header
- Calls `claimProject(id, token, req.user.id)`
- Maps: `'already-claimed'` → 409, `'forbidden'` → 403, `ProjectResponse` → 200

**New tests:**
- `GET /projects/:id` with no auth cookie → 200 (was previously tested with auth only)
- `GET /projects/:id` with valid `X-Owner-Token` → 200 with `canEdit: true`
- `GET /projects/:id` with no token and no auth → 200 with `canEdit: false`
- `GET /projects/:id` for a project owned by the authenticated user → 200 with `canEdit: true`
- `GET /projects/:id` for a project owned by a different user → 200 with `canEdit: false`
- `POST /projects/:id/claim` with correct token + auth → 200; project `user_id` is now set; `owner_token` is null
- `POST /projects/:id/claim` with wrong token + auth → 403
- `POST /projects/:id/claim` on an already-claimed project → 409
- `POST /projects/:id/claim` without auth → 401

**Acceptance criteria:**
- [ ] All new tests pass
- [ ] All existing tests still pass (0 regressions)
- [ ] `GET /projects/:id` returns 200 with no auth
- [ ] `GET /projects/:id` returns `canEdit: true` when the correct `X-Owner-Token` is provided
- [ ] After a successful claim, the project's `user_id` equals the claiming user's id and `owner_token` is null in the DB
- [ ] A second claim attempt on the same project returns 409
- [ ] `npm run build` in `packages/types/` produces updated `dist/` files
- [ ] `npm test` in `backend/` passes
- [ ] `tsc --noEmit` in `packages/types/`, `backend/`, and `frontend/` passes
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- Must not allow a logged-in user to claim a project that already has a `user_id` (even if they somehow have the old token)
- Must not expose the raw `owner_token` value in `GET /projects/:id` responses — `canEdit` is a derived boolean, not the token itself
- Must not change the `GET /projects` (list) endpoint — it remains auth-only and returns only owned projects

---

### Task 1b.4 — Frontend: anonymous store + public project page + claim prompt

> **Status:** `[x]` Complete
> **Session:** 2026-05-02
> **Depends on:** Task 1b.3

**What this task implements:**
The frontend additions needed to close the anonymous save → claim loop. Anonymous projects are tracked in localStorage via a new Zustand store. `ProjectPage.tsx` becomes publicly accessible. `RegisterPage.tsx` shows a claim prompt after successful registration. The existing `api/projects.ts` client handles the new `ownerToken` response field and sends the `X-Owner-Token` header on mutating requests.

**Files to create or modify:**
- `frontend/src/store/anonymousStore.ts` — new Zustand store persisted to `localStorage['ds-gen-anonymous']`; state: `entries: { id: string; ownerToken: string; name: string; createdAt: string }[]`; actions: `addEntry(entry)`, `removeEntry(id)`, `clearAll()`
- `frontend/src/api/projects.ts` — update `createProject`: if response contains `ownerToken`, call `anonymousStore.addEntry(...)`; update `getProject`, `updateProject`, `deleteProject` to include `X-Owner-Token` header if `anonymousStore` has an entry matching the project id
- `frontend/src/api/projects.ts` — add `claimProject(id: string, ownerToken: string): Promise<ProjectResponse>`; calls `POST /projects/:id/claim` with `X-Owner-Token` header
- `frontend/src/components/ProjectPage.tsx` — remove the auth redirect; call `GET /projects/:id` without requiring a session; show read-only view when `canEdit` is false (hide edit controls, show "Sign in to edit" prompt); show edit controls when `canEdit` is true
- `frontend/src/components/auth/RegisterPage.tsx` — after the existing register → verify-email → login sequence completes, check `anonymousStore.entries`; if non-empty, show a `ClaimPrompt` component
- `frontend/src/components/auth/ClaimPrompt.tsx` — new component; lists anonymous projects from the store; a "Claim" button per project calls `claimProject(id, ownerToken)`, then `anonymousStore.removeEntry(id)` on success; a "Skip" button dismisses the prompt without claiming; after all claims resolved (or skipped), navigate to `/`

**`ClaimPrompt` behavior:**
- Shows each anonymous project as a list item: project name (from store) + "Claim" button + "Skip" button
- On "Claim" success (200): removes entry from store, shows "✓ Claimed" inline
- On "Claim" 403/409: shows "Could not claim — may have already been saved to another account"
- "Done" button appears once all entries have been acted on; navigates to `/`
- If all entries are skipped, navigate directly to `/` without showing Done

**`ProjectPage.tsx` read-only view:**
When `canEdit` is false:
- Show project name, creation date, and a "View design system" section (config summary)
- Show a "Sign in to edit this project" or "Create account to save your own" prompt
- Do NOT redirect to `/login`

When `canEdit` is true:
- Show the same view but with an "Edit" link/button (navigates to the creation flow — Phase 2 will implement the full edit experience; for now, just stub the button as visible but disabled with "Editing available in the creation flow — coming soon")

**Acceptance criteria:**
- [ ] `POST /projects` (called without auth) stores the `ownerToken` in `anonymousStore` in localStorage
- [ ] Navigating to `/projects/:id` without being logged in shows the project in read-only mode (no redirect to `/login`)
- [ ] `GET /projects/:id` in the browser sends `X-Owner-Token` header if the project is in `anonymousStore`, and the page shows edit controls
- [ ] Opening `/projects/:id` in a fresh browser (no localStorage) shows read-only mode
- [ ] After registering and verifying email, the `ClaimPrompt` component is shown if `anonymousStore` has entries
- [ ] Claiming a project removes it from `anonymousStore` and it subsequently appears in `GET /projects` (the authenticated project list)
- [ ] Skipping all entries navigates to `/` without error
- [ ] `tsc --noEmit` in `frontend/` passes
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- Must not implement the full creation flow edit experience — the "Edit" button is visible but stubbed with a "coming soon" tooltip
- Must not change `HomePage.tsx` to show anonymous projects in the grid — the home page remains auth-only; anonymous users see their projects only via direct URLs and the `ClaimPrompt`
- Must not implement auto-save or project auto-creation during the creation flow — that is Phase 2/3

---

### Task 1b.5 — Playwright Phase 1b tests

> **Status:** `[x]` Complete
> **Session:** 2026-05-02
> **Depends on:** Task 1b.4

**What this task implements:**
Playwright e2e tests for the anonymous save and claim flow, covering the Journey 6 steps listed in `docs/user-journeys.md`.

**Files to create or modify:**
- `frontend/tests/e2e/phase-1b.spec.ts` — 4 tests

**Test cases:**

1. **Anonymous project create → shareable URL → canEdit true** (journey 6.1.2–6.1.3):
   Use the Playwright `request` fixture (no browser context) to `POST /projects` with a valid `ProjectConfig` body and no auth cookie. Assert 201, extract `project.id` and `ownerToken`. Navigate to `/projects/{id}` in the browser **with `X-Owner-Token` set via `page.setExtraHTTPHeaders`**. Assert the page loads and `canEdit` controls are visible (look for the "Edit" button or similar).

   *Note on `X-Owner-Token` delivery from the browser:* The frontend stores the token in localStorage and sends it via a custom header on fetch requests. For this test, seed the localStorage directly: `await page.goto('/projects/${id}')` after `await page.evaluate(({ id, token }) => { localStorage.setItem('ds-gen-anonymous', JSON.stringify({ entries: [{ id, ownerToken: token, name: 'Test', createdAt: new Date().toISOString() }] })) }, { id: project.id, token: ownerToken })`.

2. **Anonymous project → read-only in fresh context** (journey 6.1.4):
   Create an anonymous project via the `request` fixture. Open a new browser context (no localStorage). Navigate to `/projects/{id}`. Assert read-only mode: "Sign in to edit" text is visible; edit controls are not present.

3. **Clear localStorage → project URL read-only** (journey 6.3.1):
   Create an anonymous project via `request` fixture. Seed localStorage with the entry. Navigate to the project page; assert `canEdit` is true. Call `localStorage.clear()` via `page.evaluate`. Reload the page. Assert read-only mode.

4. **Register → claim prompt → claim → project in home grid** (journey 6.2.2–6.2.3):
   Seed localStorage with a fake anonymous project entry (using a project created via the `request` fixture). Complete the full register → verify-email → login flow (reuse the helper pattern from phase-1.spec.ts). Assert the `ClaimPrompt` component is visible listing the anonymous project. Click "Claim". Assert the entry is removed from localStorage. Navigate to `/` (home). Assert the project appears in the project list.

**Acceptance criteria:**
- [ ] `cd frontend && npx playwright test phase-1b` — all 4 tests pass
- [ ] All Phase 1 Playwright tests still pass (0 regressions)
- [ ] Journey steps 6.1.2–6.1.4, 6.2.2–6.2.3, 6.3.1 are covered (matches coverage table in `docs/user-journeys.md`)
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- Must not use page-level auth (session cookie) in tests for anonymous scenarios — use the `request` fixture for direct API calls
- Must not mock localStorage reads in the frontend components — the real Zustand persistence behavior must be exercised

---

## Phase 1b completion checklist

Before starting Phase 2, verify all of the following:

- [x] All tasks above marked `[x]` complete
- [x] `cd backend && npm test` — all tests pass (includes new anonymous project + claim tests)
- [x] `cd frontend && npx playwright test` — all Phase 1 and Phase 1b e2e tests pass (7 total)
- [x] `tsc --noEmit` in `packages/types`, `backend`, and `frontend` — all pass with zero errors
- [x] `eslint src` in `backend` and `frontend` — zero errors
- [x] `npm run build` in `packages/types/` — dist files updated
- [x] Manual verification: `POST /projects` with no auth cookie → 201 with ownerToken in response
- [x] Manual verification: `GET /projects/:id` with no auth → 200 with `canEdit: false`
- [x] Manual verification: `POST /projects/:id/claim` with correct token + auth → 200; subsequent GET shows `userId` set
- [x] Phase retrospective written to `docs/phase-1b-retro.md`
- [x] `docs/user-journeys.md` updated for Phase 2 scope
- [x] `docs/design-system-plan-summary.md` updated to mark Phase 1b Complete
- [x] Session log archived to `logs/phase-1b.md`

---

## Completed task log

*(Tasks are compressed to this format once complete. Full details live in the session log.)*

<!--
### Task 1b.X — [Task name] ✓
**Output:** [One sentence: what was built.]
**Key decisions:** [Any non-obvious choices made.]
**Session:** [Date / SESSION_LOG pointer]
-->
