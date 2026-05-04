# Phase 3 Session Log Archive

> Archived from SESSION_LOG.md after phase completion (2026-05-05).

---

## 2026-05-05 — Task 3.4: Playwright Phase 3 tests

**What was done:**

- Created `frontend/tests/e2e/phase-3.spec.ts` with 4 tests:
  - **Test 1** (Journey 3.1.1–3.1.3): Navigate to `/new` → advance through all 4 stages → click "Download package" → click "Save my project" → fill inline registration form → assert "Check your email" visible; URL still `/new`
  - **Test 2** (Journey 3.1.4–3.1.5, 3.2.2): Same flow → register in-flow (intercept `X-Verification-Token`) → verify via `request` fixture → login → assert claim prompt → claim → assert project card in home grid → click card → assert Foundation heading and SaaS chip on project page
  - **Test 3** (Journey 3.2.3–3.2.5): Register+verify via `request` API → login via browser → create project via `page.evaluate(fetch('/projects', ...))` → navigate to `/projects/:id` → assert config matches → change color direction → intercept PATCH (assert fires within 1s) → advance to Stage 4 → assert saved URL banner → click "Download package" → intercept ZIP request
  - **Test 4** (Journey 3.3.4–3.3.5): Same auth setup → create project → navigate to home → open overflow menu → Duplicate → assert 2 cards → open original's menu → Delete → confirm dialog → assert only copy remains
- Updated `docs/user-journeys.md`: removed Journey 3 from "not yet covered" section; marked all Phase 3 steps as covered
- Fixed `frontend/src/store/userStore.ts`: changed `isLoading` initial value from `false` to `true` — this is a real correctness bug; home page redirected to `/login` on any full page reload before `fetchUser()` completed, because the redirect effect fired with initial `{user: null, isLoading: false}` state

**Decisions made:**

- `page.evaluate(async (config) => { await fetch('/projects', { credentials: 'include', ... }) })` for creating authenticated projects in tests — `page.request.post(BACKEND_URL + '/projects')` doesn't reliably send the session cookie from the browser context; `page.evaluate` runs inside the browser's JS context with the full cookie store at the app's origin, ensuring the session is forwarded through the Vite proxy to the backend
- `apiRegisterVerifyBrowserLogin` helper: uses `request` fixture (direct API calls, no browser UI) for register + verify; then browser form for login — avoids route intercept overhead for Tests 3 and 4; direct API registration requires `displayName` field (not `name`)
- `userStore.isLoading` initialized to `true` (not `false`) — prevents the home page from redirecting to `/login` before `fetchUser()` resolves; all 16 tests still pass

**Verification:**
- `tsc --noEmit` in `frontend/`: zero errors
- `npx eslint frontend/src frontend/tests --max-warnings 0`: zero errors
- `npx playwright test phase-3`: 4/4 pass
- `npx playwright test`: 16/16 pass (no regressions)

---

## 2026-05-04 — Task 3.3: Home page project grid

**What was done:**

- Created `frontend/src/components/home/ProjectCard.tsx`: palette thumbnail (5 color strips at steps 100/300/500/700/900 via `generateColorScale` from `@pipeline/palette/generator`); project name as `<h3>` with click-to-navigate (heading role required by Phase 1b tests); overflow menu (⋯) with click-outside detection via `mousedown` listener; Rename (inline `<input>` replacing the `<h3>`, Enter/blur commits, Escape cancels, empty name rejected); Duplicate (`createProject` with "(copy)" suffix); Delete (`window.confirm` then `deleteProject`); all mutations call `onMutate()` to trigger parent re-fetch; type chip and mode chips from config; "Last exported" date or "Never"
- Rewrote `frontend/src/components/home/ProjectGrid.tsx`: passes `onMutate` through to each `ProjectCard`; empty state unchanged
- Rewrote `frontend/src/components/home/HomePage.tsx`: extracted `loadProjects` as a `useCallback` so it can be passed as `onMutate` to `ProjectGrid`; added "New project" button that calls `resetConfig()` then navigates to `/new`; imports `useConfigStore` for `resetConfig`

**Decisions made:**

- Project name rendered as `<h3>` with `onClick` rather than a `<button>` — `getByRole('heading', { name: ... })` is used in Phase 1b tests; a `<button>` has role "button", not "heading"
- `generateColorScale` called directly in `ProjectCard` render — browser-safe (only imports `chroma-js`); acceptable perf for 3–12 cards; no memoization needed for Phase 3
- `onMutate` is `loadProjects` from `HomePage` — triggers a full re-fetch of the project list; simpler than local optimistic updates and ensures server state is authoritative after mutations

**Verification:**
- `tsc --noEmit` in `frontend/`: zero errors
- `npx eslint src/components/home/`: zero errors
- `npx playwright test`: 12/12 pass (no regressions)

---

## 2026-05-04 — Task 3.2: Saved project page (`/projects/:id`)

**What was done:**

- Updated `frontend/src/store/uiStore.ts`: added `setIsSaving(v: boolean)` and `setLastSavedAt(d: Date | null)` actions; changed `setSavedProjectId` signature to accept `string | null` (was `string` only)
- Created `frontend/src/components/shared/SaveIndicator.tsx`: reads `isSaving` and `lastSavedAt` from `uiStore`; shows "Saving…" / "Saved X min ago" / nothing; `formatAge` computes relative time at render
- Updated `frontend/src/components/NewProjectPage.tsx`: imported `SaveIndicator`; added `savedProjectId` from `uiStore`; shows `<SaveIndicator />` in header when project is saved
- Rewrote `frontend/src/components/ProjectPage.tsx`: loads project via `getProject(id)`; hydrates `useConfigStore.setState({ config })` (bypasses localStorage write — server is source of truth); sets `projectName` and `savedProjectId` in `uiStore`; renders same 4-stage layout as `NewProjectPage` with own header (project name, "← Projects" link, "You own this" / "Sign in to edit" badge, `SaveIndicator`); auto-save effect watches `config`, skips initial load via `initialConfigJson` ref comparison, debounces 500ms, only fires for authenticated owners; cleanup on unmount resets config to `DEFAULT_CONFIG` and clears `uiStore` saved/saving state; re-added "You own this" badge (green pill) — required by Phase 1b tests
- Updated `backend/src/api/generate.ts`: `GET /:id/export.zip` now stamps `last_exported_at` via `void updateProject(result.id, { lastExportedAt: new Date() })` after `res.send(buffer)`; `updateProject` was already imported

**Decisions made:**

- `useConfigStore.setState({ config })` instead of `setConfig(partial)` — bypasses the setter's localStorage write; the project page's source of truth is the server, not localStorage; preserves any existing `/new` draft in localStorage
- `initialConfigJson` ref (stringified) for skip-initial-load detection — comparing serialized JSON avoids reference equality issues with nested config objects; after the user reverts to the exact original config, the save is skipped (acceptable edge case)
- Cleanup restores `DEFAULT_CONFIG` via direct `setState` (no localStorage clear) — avoids wiping a user's `/new` draft if they visit a project page and then navigate back to `/new`
- "You own this" badge restored in new `ProjectPage` header — the Phase 1b Playwright tests assert this element's presence for `canEdit: true` projects

**Verification:**
- `tsc --noEmit` in `frontend/` and `backend/`: zero errors
- `cd backend && npm test`: 269/269 pass
- `npx playwright test`: 12/12 pass (no regressions)

---

## 2026-05-04 — Task 3.1: In-flow registration modal at Stage 4

**What was done:**

- Created `frontend/src/components/flow/Stage4RegistrationPrompt.tsx`: state machine with 4 states (`teaser` → `form` / `submitting` → `success`); teaser shows "Save my project" / "Sign in" / "Just download" links; form has display name, email, password fields with required validation; `submitting` disables all fields and changes button label; `success` shows "Check your email" with the submitted email address and a link to `/login`; `dismissed` flag hides the entire component when "Just download" is clicked; API errors shown inline below the form
- Updated `frontend/src/components/flow/Stage4.tsx`: replaced static account-prompt banner (two navigation buttons) with `<Stage4RegistrationPrompt />`; added import

**Decisions made:**

- "Just download" sets `dismissed: boolean` state on the component — renders null when true. Keeps it simple without lifting state to Stage4.
- Back arrow (✕) on the form returns to `teaser` state rather than dismissing — user can re-open the form after closing it, matching expected modal-like behavior.
- `register()` errors surface the raw `err.message` — the backend returns descriptive messages (e.g. "Email already registered") that are appropriate to show directly.

**Verification:**
- `tsc --noEmit` in `frontend/`: zero errors
- `npx eslint src/components/flow/Stage4*.tsx`: zero errors
- `npx playwright test`: 12/12 pass (no regressions)
