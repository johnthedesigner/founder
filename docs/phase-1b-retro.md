# Phase 1b Retrospective — Anonymous Projects and Claim

**Dates:** 2026-05-02
**Tasks:** 5 (migration, backend API, types, frontend, Playwright)
**Tests added:** 18 backend + 4 Playwright = 22

---

## What was built

A CodePen-style anonymous project model. Any visitor can create a project and receive a permanent shareable URL without creating an account. An `owner_token` stored in `localStorage` gates edit access. When the user later creates an account, a claim prompt transfers ownership. Projects whose tokens are lost remain publicly viewable but become read-only.

Key pieces:
- `projects.user_id` nullable (FK changed to `SET NULL`)
- `owner_token TEXT` column with unique index
- Partial unique index `WHERE user_id IS NOT NULL` preserves per-user slug uniqueness while allowing anonymous duplicates
- `optionalAuth` middleware: attempts cookie auth, always calls `next()` — never returns 401
- `computeCanEdit(row, auth?)` in the service layer: compares request auth context to DB row; route never touches `owner_token` directly
- `canEdit: boolean` on every `ProjectResponse`
- `POST /projects/:id/claim`: validates token, transfers ownership, clears `owner_token`
- `anonymousStore` Zustand store persisted to localStorage
- `X-Owner-Token` header sent on fetch calls when the project is in the store
- `ClaimPrompt` component: per-entry claim/skip, auto-navigates to `/` when all entries resolved

---

## What went well

**The `optionalAuth` design paid off immediately.** A single middleware handles both authenticated and anonymous callers on the same route — no duplicate route handlers, no conditional `requireAuth`. The pattern is composable; any route that should behave differently for authenticated vs. anonymous callers just uses `optionalAuth` and inspects `req.user`.

**Service-layer ownership model.** `computeCanEdit` lives next to the row model. Routes pass raw auth headers; the service decides what "can edit" means. This kept route handlers thin and made the `claimProject` logic clean to add.

**Partial unique index.** The `WHERE user_id IS NOT NULL` approach was exactly right. Postgres treats all NULLs as distinct for unique constraints anyway, but the partial index makes the intent explicit and gives us the right behavior for free.

**Test 4 (register → claim → home) passed on first run** after fixing the Vite proxy bug. The localStorage seeding approach (`page.goto` to establish origin, `page.evaluate` to write, then `page.goto` target) is simple and doesn't require `addInitScript` (which would re-seed on every navigation, breaking the clear-localStorage test).

---

## What was hard

**The Vite proxy swallowing SPA routes.** Navigating to `/projects/:id` in the browser forwarded to the backend (which returned JSON) instead of serving `index.html`. The fix — a `bypass` function that detects `Accept: text/html` headers and returns `/index.html` — is clean, but it's a footgun that will catch any future SPA routes that overlap with proxied paths.

**Render-time `navigate()` in `ClaimPrompt`.** The initial implementation called `navigate('/')` during render when `entries.length === 0`. This is a React anti-pattern. Caught in testing and moved to a `useEffect`.

**Running Playwright against an empty dev database.** The first test run failed because `reuseExistingServer` latched onto the dev server (pointing at `ds_gen_dev`, which had no tables). Diagnnosing required tracing through the `DATABASE_URL` env var handling — the `=` prefix syntax for env vars doesn't work reliably with `psql`. Solution: kill the dev server before running Playwright tests. Future improvement: document this in the project README or add a `beforeAll` health check to the Playwright config.

---

## Design decisions

**`claimProject` returns `'forbidden'` for non-existent IDs (not `null`)** so callers learn whether an ID exists only if they also have the correct token. A bad actor shouldn't enumerate project IDs via the claim endpoint.

**`'ownerToken' in data` for nullable column updates.** Differentiates "don't touch owner_token" (key absent) from "set to NULL" (key present, value null). Required for the claim operation which needs to explicitly clear the column.

**ClaimPrompt in `LoginPage.tsx` not `RegisterPage.tsx`.** Claiming requires an authenticated session, which only exists after login. Placing the prompt at login also handles returning users who have anonymous projects from a previous session — they don't need to re-register to claim.

**`page.evaluate` not `page.addInitScript` for localStorage seeding in tests.** `addInitScript` runs on every navigation in the page context; using it would re-seed localStorage after `localStorage.clear()` in the clear-storage test (test 3), making it untestable. The `evaluate` approach seeds once; subsequent navigations preserve the value naturally.

---

## Things to watch in Phase 2

- The creation flow will need to call `createProject` with no auth and store the `ownerToken`. The API function (`frontend/src/api/projects.ts:createProject`) already handles this — it stores the token in `anonymousStore` automatically.
- `ProjectPage.tsx` shows a raw JSON dump as a placeholder. Phase 2 will replace this with the actual editor.
- The "Sign in to edit" link on `ProjectPage` currently goes to `/login`. Phase 2 should decide whether to route to `/login` or `/register` (or show a modal).
- The `vite.config.ts` proxy bypass uses `Accept: text/html` detection. Any future SPA route added under `/projects` or `/auth` (e.g., `/auth/reset-password`) must either be an existing bypass-covered path or have a bypass rule added.
