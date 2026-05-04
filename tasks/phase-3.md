# Phase 3 — Accounts and Persistence

> **Status:** Not started
> **Depends on:** Phase 2 complete (all tasks marked `[x]`, all tests passing)
> **Reference:** `docs/design-system-dev-plan.md` § Phase 3 — Accounts and Persistence

---

## Overview

Account creation, project saving, and return-to-project are fully integrated into the user flow. At Stage 4, anonymous users can register in-place; the anonymous project is then claimable post-login via the existing Phase 1b claim flow. Authenticated users who return to `/projects/:id` see their full config restored across all stages and changes auto-save via debounced PATCH. The home page becomes a fully functional project management grid with rich cards, overflow menus, and palette thumbnails.

No new backend endpoints or DB migrations are required — all CRUD routes and the claim endpoint exist from Phases 1 and 1b.

---

## Tasks

### Task 3.1 — In-flow registration modal at Stage 4

> **Status:** `[x]` Complete
> **Session:** 2026-05-04
> **Depends on:** none (Phase 2 complete)

**What this task implements:**
The flat account-prompt banner in Stage 4 (currently just links to `/register` and `/login`) is replaced with an inline registration form. Submitting the form calls `POST /auth/register`; on success the modal shows "Check your email." After the user verifies and logs in (existing flows), the Phase 1b claim prompt appears and transfers the anonymous project to their account.

**Files to create or modify:**
- `frontend/src/components/flow/Stage4.tsx` — replace static account-prompt banner with `<RegistrationPrompt>`; pass `savedProjectId` for context
- `frontend/src/components/flow/Stage4RegistrationPrompt.tsx` — new: name + email + password form; calls `register()`; idle / submitting / success / error states; "I already have an account → /login" link; "Just download" dismiss link

**Acceptance criteria:**
- [x] "Save my project" button opens the registration form inline (not a separate page)
- [x] Form has display name, email, and password fields; all are required
- [x] Submit button is disabled while the request is in flight
- [x] On success, form area transitions to "Check your email for a verification link" message; no redirect
- [x] If the API returns an error (e.g. duplicate email), the error message is shown inline below the form
- [x] "I already have an account" link navigates to `/login` (same tab)
- [x] "Just download" link dismisses the prompt section without registering and without navigating away
- [x] The ZIP download and CLI/Figma sections of Stage 4 are unaffected
- [x] `tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `SESSION_LOG.md` updated with session entry and new Current State block

**Must not do:**
- Does not implement email verification or auto-login after registration — those use the existing `/verify-email` and `/login` flows
- Does not implement the project claim step — Phase 1b `ClaimPrompt` already handles that post-login
- Does not change the anonymous project creation (`ensureSaved`) logic
- Does not add backend changes

---

### Task 3.2 — Saved project page (`/projects/:id`)

> **Status:** `[x]` Complete
> **Session:** 2026-05-04
> **Depends on:** Task 3.1

**What this task implements:**
`ProjectPage.tsx` is fully wired: it loads the project from the API, hydrates `configStore` and `uiStore`, renders the full four-stage creation flow, and auto-saves config changes to the backend with a 500ms debounce. A "Saved / Saving…" indicator appears in the header.

**Files to create or modify:**
- `frontend/src/components/ProjectPage.tsx` — rewrite the stub: fetch project by URL param `id`; on load populate `configStore` (full config), `uiStore.projectName`, and `uiStore.savedProjectId`; render the same four-stage layout as `NewProjectPage`; `useEffect` watching `config` (from `configStore`) debounces `updateProject(id, { config })` at 500ms; skip the first render to avoid a spurious save on load; only auto-save if `user` is authenticated
- `frontend/src/store/uiStore.ts` — add `setIsSaving(v: boolean)` and `setLastSavedAt(d: Date | null)` actions; wire them into the `isSaving` / `lastSavedAt` fields that already exist
- `frontend/src/components/shared/SaveIndicator.tsx` — new: reads `isSaving` and `lastSavedAt` from `uiStore`; renders "Saving…" when in-flight, "Saved X min ago" otherwise, nothing if `lastSavedAt` is null
- `frontend/src/components/NewProjectPage.tsx` — add `<SaveIndicator />` to the header (visible when `savedProjectId` is non-null)
- `backend/src/api/generate.ts` — update `GET /:id/export.zip` to also stamp `last_exported_at` (currently only the POST `/export` route does this); import `updateProject` from db queries and call it after generating the ZIP buffer

**Acceptance criteria:**
- [x] Navigating to `/projects/:id` (when authenticated and owner) loads the project and shows all four stages with the saved config pre-filled
- [x] Stage 1 shows the correct project type, color direction, and mode; Stage 2 shows the correct axis selections; Stage 3 shows the correct project name
- [x] Stage 4 on `/projects/:id` shows the project as already saved (the "saved" banner and shareable URL are visible immediately without clicking "Download package")
- [x] Changing a config option in Stage 1 or Stage 2 triggers a PATCH request within 600ms (500ms debounce + network); the "Saving…" indicator appears during the request
- [x] "Saved X min ago" appears in the header after the PATCH completes
- [x] No PATCH is fired on initial load (loading the project must not mark it as modified)
- [x] Unauthenticated users visiting a public project URL see the project in read-only mode (no auto-save fires); `canEdit: false` from the API results in no edit controls in the header
- [x] `GET /projects/:id/export.zip` now updates `lastExportedAt` on the project row
- [x] Downloading the ZIP from Stage 4 on a saved project uses the project's slug as the filename
- [x] `tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `SESSION_LOG.md` updated

**Must not do:**
- Does not extract a shared layout component from `NewProjectPage` — `ProjectPage` renders its own layout independently (avoid premature abstraction)
- Does not add account settings, CLI token management, or other settings pages (Phase 4)
- Does not implement read-only stage rendering (edit controls may still be visible; just no auto-save fires)

---

### Task 3.3 — Home page project grid

> **Status:** `[x]` Complete
> **Session:** 2026-05-04
> **Depends on:** Task 3.2

**What this task implements:**
The home page project grid gets full cards with palette thumbnails, metadata chips, and an overflow menu with Rename, Duplicate, and Delete actions. A "New project" button resets the config and navigates to `/new`.

**Files to create or modify:**
- `frontend/src/components/home/ProjectGrid.tsx` — rewrite: full card layout with palette thumbnail (5 color dots from primary scale using `generateColorScale` imported via `@pipeline` alias), project type chip, mode chips (Light / Dark / Both), "Last exported" timestamp (or "Never" if null), overflow menu button (⋯); grid re-renders after any mutation
- `frontend/src/components/home/ProjectCard.tsx` — new: one card with all of the above; owns the overflow menu open/close state; handles Rename (inline `<input>` replacing the project name, blur/Enter to save via `updateProject`), Duplicate (`createProject({ name: "${name} (copy)", config })`), Delete (browser `confirm()` dialog then `deleteProject(id)`)
- `frontend/src/components/home/HomePage.tsx` — add "New project" button that calls `useConfigStore.getState().resetConfig()` then navigates to `/new`; pass a `onMutate` refresh callback to `ProjectGrid` so cards can trigger a list reload after rename/duplicate/delete
- `frontend/src/store/configStore.ts` — no changes needed; `resetConfig()` already exists

**Acceptance criteria:**
- [x] Each project card shows: 5 palette color dots (primary scale steps 100, 300, 500, 700, 900), project name, project type chip (e.g. "SaaS / Web App"), mode chips (e.g. "Light" / "Dark" / "Both"), last exported date ("Never" if `lastExportedAt` is null)
- [x] Clicking a project card navigates to `/projects/:id`
- [x] "New project" button resets config to defaults and navigates to `/new`
- [x] Overflow menu (⋯) opens inline; clicking outside closes it
- [x] Rename: clicking Rename replaces the card title with an `<input>`; pressing Enter or blurring saves via PATCH; Escape cancels; empty name is rejected
- [x] Duplicate: creates a new project named "{original name} (copy)"; new card appears in the grid
- [x] Delete: shows `confirm()` dialog "Delete {name}? This cannot be undone."; on confirm removes the card from the grid
- [x] The grid refreshes after every mutation (rename, duplicate, delete) without a full page reload
- [x] `tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `SESSION_LOG.md` updated

**Must not do:**
- Does not implement a dedicated rename modal — inline input on the card is sufficient
- Does not implement project card drag-to-reorder (Phase 4+)
- Does not add project search or filtering

---

### Task 3.4 — Playwright Phase 3 tests

> **Status:** `[x]` Complete
> **Session:** 2026-05-05
> **Depends on:** Tasks 3.1, 3.2, 3.3

**What this task implements:**
Four Playwright tests covering the Phase 3 journey steps: in-flow registration, returning to a saved project with config intact, re-exporting from a saved project, and home page project management (duplicate + delete).

Journey steps covered: 3.1.1–3.1.5, 3.2.2–3.2.5, 3.3.4, 3.3.5

**Files to create or modify:**
- `frontend/tests/e2e/phase-3.spec.ts` — 4 new tests (see below)
- `docs/user-journeys.md` — update coverage table to mark 3.1.1–3.1.5, 3.2.2–3.2.5, 3.3.4, 3.3.5 as covered

**Tests:**

**Test 1 — Complete flow → register in-flow → "Check your email"** (Journey 3.1.1–3.1.3)
1. Navigate to `/new`
2. Complete Stage 1–3 with default settings; enter a project name
3. At Stage 4, click "Download package" (triggers `ensureSaved` → anonymous project created)
4. Click "Save my project" (opens registration prompt)
5. Fill display name, email, password → submit
6. Assert "Check your email" message is visible
7. Assert no redirect has occurred (still on `/new`)

**Test 2 — Register → verify → login → claim → project in home grid → return → config intact** (Journey 3.1.4–3.1.5, 3.2.2)
1. Complete Stage 1–4 and save anonymously (get `projectId` from `anonymousStore`)
2. Click "Save my project" → register (intercept `X-Verification-Token` from response header)
3. Call `POST /auth/verify-email` via `request` fixture with the token
4. Log in via form → home page loads
5. Assert claim prompt is visible; click "Claim"
6. Assert project card appears in home grid
7. Click the project card → navigates to `/projects/:id`
8. Assert Stage 1 shows the same project type that was selected during creation

**Test 3 — Return to saved project → re-export → filename includes project slug** (Journey 3.2.3–3.2.5)
1. Register + verify + login + create an authenticated project (via API in `request` fixture)
2. Navigate to `/projects/:id`
3. Assert Stage 1 config matches the API-stored config
4. Change a color direction in Stage 1 → assert PATCH fires within 1s (intercept `PATCH /projects/:id`)
5. Navigate to Stage 4; click "Download package"
6. Assert download is triggered (intercept `GET /projects/:id/export.zip`)

**Test 4 — Home page: duplicate and delete** (Journey 3.3.4–3.3.5)
1. Register + verify + login + create a project (via API)
2. Navigate to `/`; assert project card is visible
3. Open overflow menu → click "Duplicate"
4. Assert two cards are visible (original + copy with "(copy)" in name)
5. Open overflow menu on original → click "Delete" → confirm dialog
6. Assert only the copy card remains

**Acceptance criteria:**
- [x] All 4 tests pass: `cd frontend && npx playwright test phase-3`
- [x] All prior tests still pass: `npx playwright test` (12 + 4 = 16 total)
- [x] `docs/user-journeys.md` coverage table updated
- [x] `tsc --noEmit` passes
- [x] `npm run lint` passes (no lint script; eslint passes directly)
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- Does not test the CLI auth token flow (Phase 4)
- Does not test the agent API endpoint (Phase 4)
- Does not add tests for read-only project access (lower priority; backend integration tests cover the auth logic)

---

## Phase completion checklist

Run this checklist before marking the phase complete and starting Phase 4.

- [x] All 4 tasks above are marked `[x]`
- [x] `cd backend && npm test`: zero failures (269/269)
- [x] `cd frontend && npx playwright test`: all tests pass (16/16)
- [x] `tsc --noEmit` in `backend/`, `frontend/`, `packages/types/`: zero errors
- [x] `npm run lint` in `frontend/`: zero errors (no lint script; eslint passes directly)
- [x] `SESSION_LOG.md` has a complete entry for every session in this phase
- [x] `docs/design-system-plan-summary.md` updated to reflect Phase 3 complete
- [x] `docs/user-journeys.md` reviewed — coverage table updated for all newly-enabled steps
- [x] Phase retrospective written to `docs/phase-3-retro.md`
- [x] Session log archived to `logs/phase-3.md`
- [x] Phase 4 task file generated

---

## Completed task log

*(Tasks are compressed to this format once complete. Full details live in the session log.)*

<!--
### Task 3.X — [Task name] ✓
**Output:** [One sentence: what was built.]
**Key decisions:** [Any non-obvious choices made.]
**Session:** [Date / SESSION_LOG pointer]
-->
