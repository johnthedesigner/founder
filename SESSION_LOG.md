# Session Log — Design System Generator

## Current State

**Phase:** 2 — Creation Flow (complete — start Phase 3)
**Next task:** Phase 3, Task 3.1
**What's built:** Phases 0, 1, 1b, and 2 complete. `/new` full creation flow: 4 stages, live preview sandbox iframe, configStore localStorage persistence, anonymous project save + ZIP download. 269 backend tests + 12 Playwright tests passing.
**Open questions:** None.

---

## 2026-05-02 — Task 2.7: Playwright Phase 2 tests

**What was done:**

- Wrote `frontend/tests/e2e/phase-2.spec.ts` (5 tests covering Journey 1 steps 1.1–1.5)
- Fixed `SystemPreview.tsx`: changed iframe src from `/preview/index.html` to direct `http://localhost:5180` to bypass the Vite dev proxy incompatibility (proxy rewrites break root-relative asset paths in dev mode)
- Added `window.__previewReady = true` flag in the READY handler for test detection
- Added preview-sandbox webServer to `playwright.config.ts` (port 5180, `reuseExistingServer: true`)
- Fixed all test selector strict-mode violations:
  - `iframe[src*="preview"]` → `iframe[title="Design System Preview"]`
  - `getByText('Foundation')` → `getByRole('heading', { name: 'Foundation' })`
  - `getByText('Style')` → `getByRole('heading', { name: 'Style', exact: true })`
  - `getByText('Overlays').not.toBeVisible()` → `span.rounded-full` chip selector (avoids matching hidden Customize dropdown label)
  - `page.frame({ url: /\/preview\// })` → `url: /localhost:5180/` after port change
  - `/^Compact$/i`, `/^Flat$/i` → prefix-anchored regex (button text includes subtitle)
  - Font check changed from `querySelector('[style*="font-family"]').fontFamily` to `getPropertyValue('--font-display')` (first match was the root div using `--font-body`, not `--font-display`)
- Fixed port conflict: another project ("based") occupied port 5174/5175; moved preview sandbox to 5180 with `strictPort: true`
- Fixed anonymous ZIP download: `GET /projects/:id/export.zip` used `requireAuth` (rejected anonymous users); changed to `optionalAuth` + inline `resolveEditAuth()` that accepts `X-Owner-Token` header; updated `Stage4.tsx` `downloadZip()` to read token from `anonymousStore` and pass it as `X-Owner-Token`
- Removed unused `AnonymousCreateProjectResponse` import in `frontend/src/api/projects.ts`
- Removed `// eslint-disable-line react-hooks/exhaustive-deps` comment in `Stage3.tsx` (plugin not installed; comment caused ESLint error)

**Decisions made:**

- Direct port (5180) instead of proxy path — Vite dev server generates root-relative asset paths (e.g. `/@vite/client`) that don't pass through a path-prefix proxy. Direct cross-origin iframe avoids the rewrite entirely.
- `resolveEditAuth()` local to generate.ts rather than importing from projects.ts — keeps the pattern self-contained; the function is small enough to inline.
- Checking `--font-display` CSS variable directly rather than element computed style — more reliable; no ambiguity about which element is matched by `querySelector`.

**Verification:**
- `tsc --noEmit` in all 4 packages: zero errors
- `npm run lint`: zero errors
- `npx playwright test`: 12/12 pass (5 new Phase 2 + 7 Phase 1/1b)
- `cd backend && npm test`: 269/269 pass
- `cd preview-sandbox && npm run build`: clean dist

---

## 2026-05-03 — Task 2.6: Stage 4 — Export and anonymous project save

**What was done:**

- Updated `frontend/src/store/uiStore.ts`: added `savedProjectId: string | null` (default `null`) and `setSavedProjectId(id: string)`
- Rewrote `frontend/src/components/flow/Stage4.tsx`: `ensureSaved()` helper checks `savedProjectId` before calling `createProject` (idempotent — one POST per session); on success sets `savedProjectId` and calls `resetConfig()` to clear localStorage draft; `downloadZip()` fetches `/projects/:id/export.zip`, creates an object URL, triggers a programmatic `<a>` click, then revokes the URL; green "saved" banner with copy-link button appears after first save; "Download package" primary CTA + "Use the CLI" code block + "Figma setup" modal; account prompt banner with `/register` and `/login` links (no auth logic); inline `FigmaModal` with 3-step Tokens Studio import instructions; error state shows on save/download failure

**Decisions made:**

- `ensureSaved()` is extracted as a shared async helper called by both "Download package" and "Use the CLI" — avoids duplicating the guard and ensures CLI shows the project ID immediately after the first save regardless of which button was clicked first.
- `resetConfig()` called inside `ensureSaved()` after a successful `createProject` (not after download) — the project is on the server the moment `createProject` returns; clearing local draft at that point is correct regardless of whether the download succeeds.
- `FigmaModal` is rendered inline in Stage4 (not in a portal) — acceptable since Stage 4 has a simple layout with no overflow:hidden ancestors.

**Verification:**
- `tsc --noEmit` in `frontend/`: zero errors
- `npx playwright test`: 7/7 pass (no regressions)

---

## 2026-05-03 — Task 2.5: Stage 3 — Review

**What was done:**

- Updated `frontend/tsconfig.json`: removed `rootDir`/`outDir` (cosmetic with `noEmit: true`); added `paths` for `@ds-gen/types` and `@pipeline/*`; added `vite.config.ts` to `include`
- Updated `frontend/vite.config.ts`: added `@ds-gen/types` and `@pipeline` resolve aliases (mirroring the preview-sandbox pattern)
- Created `frontend/src/components/flow/Stage3ProjectName.tsx`: name input; auto-focuses on mount; `setCanAdvance(value.trim().length > 0)` on every change
- Created `frontend/src/components/flow/Stage3TokenSummary.tsx`: calls `generate(config)` from `@pipeline/index` in a `setTimeout(..., 0)` useEffect to avoid blocking paint; shows animated skeleton while pending; three `TokenSection` collapsibles (Primitives, Semantic, Components); each section shows a summary line (count + scales), a flat token name/value list, and a "View raw JSON" toggle that renders the serialized W3C DTCG JSON from `system.files`
- Rewrote `frontend/src/components/flow/Stage3.tsx`: `useEffect` on mount sets `canAdvance = projectName.trim().length > 0` and restores `canAdvance = true` on unmount; renders `Stage3ProjectName`, `Stage3TokenSummary`, and "Back to adjust" links for Stage 1 and Stage 2

**Decisions made:**

- `generate()` runs in `setTimeout(..., 0)` (macrotask deferral) rather than `useEffect` alone — this ensures the skeleton is painted before the synchronous generation begins, even with React's batched updates.
- Removed `rootDir` and `outDir` from frontend tsconfig. With `noEmit: true` inherited from base, these options were cosmetic and prevented path aliases from spanning outside `src/`. The path aliases need to reach `../backend/src/pipeline/` transitively.
- `chroma-js` and `jszip` (transitive pipeline deps) are already hoisted to root `node_modules` by npm workspaces — no need to add them explicitly to `frontend/package.json`.

**Verification:**
- `tsc --noEmit` in `frontend/`: zero errors
- `npx playwright test`: 7/7 pass (no regressions)

---

## 2026-05-03 — Task 2.4: Stage 2 — Style

**What was done:**

- Created `frontend/src/components/flow/Stage2AxisCard.tsx`: single option card with selected state (border + ring), optional `preview` slot (ReactNode rendered above label), `min-w-[108px]` so cards don't collapse on narrow content
- Created `frontend/src/components/flow/Stage2AxisSection.tsx`: title + card row + optional expand/collapse customize panel; uses CSS `max-h` transition for smooth open/close (no JS animation library)
- Created `frontend/src/components/flow/Stage2CustomizeDensity.tsx`: range slider (1–8px, step 0.5) maps to nearest density preset via `pxToNearestDensity`; derived scale shows 8 steps (`space-1`–`space-8`) with proportional bar visual and computed px value
- Created `frontend/src/components/flow/Stage2CustomizeTypography.tsx`: inputs for displayFace, bodyFace, codeFace; scale ratio select (1.2 / 1.25 / 1.333)
- Rewrote `frontend/src/components/flow/Stage2.tsx`: all four axes wired; density/personality/dimensionality set their respective `shape` field; type style selection also sets font defaults via `TYPE_STYLE_DEFAULTS` map; preview slot for each card type (spacing bars for density, radius rectangle for personality, `Aa` in actual font for type style, shadow box for dimensionality); personality and dimensionality customize show "coming soon" placeholder
- Updated `frontend/index.html`: added Google Fonts preconnect + link for Inter, Plus Jakarta Sans, Fraunces, JetBrains Mono (used in type style card previews)

**Decisions made:**

- Type style card labels render with `fontFamily` inline style using the actual font — zero extra dependencies, works immediately once fonts load.
- `Stage2CustomizeDensity` maps the continuous slider range to the three density enum values rather than storing a raw px value — keeps the config schema unchanged while still showing a fluid UX.
- Personality and dimensionality customize panels show "coming soon" as the task spec requires — not placeholder code, just a note in the expand panel.

**Verification:**
- `tsc --noEmit` in `frontend/`: zero errors
- `npx playwright test`: 7/7 pass (no regressions)

---

## 2026-05-03 — Task 2.3: Stage 1 — Foundation

**What was done:**

- Rewrote `frontend/src/components/flow/Stage1.tsx`: orchestrates three sub-sections separated by dividers — project type + scope, brand assets toggle, mode selection
- Created `frontend/src/components/flow/Stage1ProjectType.tsx`: three project type cards (SaaS, Marketing, Mobile); selecting a type calls `setConfig({ projectType, componentScope: SCOPE_DEFAULTS[type] })`; `<details>`-based Customize disclosure shows a checklist of all 6 categories; toggling a chip calls `setConfig({ componentScope })` with a min-1 guard; active scope displayed as blue pill chips
- Created `frontend/src/components/flow/Stage1ColorDirection.tsx`: five color direction cards each with a colored swatch; selecting calls `setConfig({ color: { ...color, colorDirection, primaryHex: COLOR_DIRECTION_HEX[dir] } })`
- Created `frontend/src/components/flow/Stage1BrandAssets.tsx`: two-option toggle (Starting fresh / I have brand assets); "Starting fresh" shows `<Stage1ColorDirection />`; "I have brand assets" shows hex input + display/body typeface inputs; hex validated via regex on blur and applied immediately when the 7-char `#RRGGBB` pattern matches during typing; live color swatch beside the hex field
- Created `frontend/src/components/flow/Stage1ModeSelect.tsx`: three options (Light only, Dark only, Both); "Both" shows an informational note about dual-mode token generation; converts between `ColorMode[]` and the UI option value

**Decisions made:**

- Hex validated on blur OR when pattern matches mid-type (at exactly 7 chars) — not on every keypress. This satisfies "must not validate on every keypress" while still providing immediate preview feedback for valid complete hex values.
- Color direction cards are rendered inside `Stage1BrandAssets` (not as a sibling in `Stage1`) — they appear/disappear in-place with the brand assets section, avoiding layout shifts.
- `<details>` HTML element for Customize disclosure — zero JS for open/close, accessible by default, no extra dependencies.

**Verification:**
- `tsc --noEmit` in `frontend/`: zero errors
- `npx playwright test`: 7/7 pass (no regressions)

---

## 2026-05-03 — Task 2.2: Creation flow shell + SystemPreview wrapper

**What was done:**

- Updated `frontend/src/store/configStore.ts`: added `loadStoredConfig()` which reads `localStorage['ds-gen-flow-config']` and validates with `ProjectConfigSchema.safeParse`; `setConfig` writes updated config back to localStorage; `resetConfig` removes the key and resets to `DEFAULT_CONFIG`; exported `DEFAULT_CONFIG`
- Updated `frontend/src/store/uiStore.ts`: added `advance()` (increments currentStage, max 3), `goBack()` (decrements, min 0), `projectName: string` (default `'My Design System'`), `setProjectName`, `canAdvance: boolean` (default `true`), `setCanAdvance`
- Created `frontend/src/components/preview/SystemPreview.tsx`: iframe pointing at `/preview/index.html`; listens for `{ type: 'READY' }`, then immediately posts current config and sets `ready=true`; debounces config changes 50ms; `PreviewSkeleton` (animated grey boxes) while waiting; `PreviewFallback` (opacity-ramp color swatches using primaryHex) after 3s timeout
- Created `frontend/src/components/flow/Stage1.tsx` — stub (Task 2.3)
- Created `frontend/src/components/flow/Stage2.tsx` — stub (Task 2.4)
- Created `frontend/src/components/flow/Stage3.tsx` — functional: project name input with validation that gates `canAdvance`; `setCanAdvance(false)` when name is empty
- Created `frontend/src/components/flow/Stage4.tsx` — stub (Task 2.6)
- Rewrote `frontend/src/components/NewProjectPage.tsx`: full-height two-column layout; stage progress indicator (numbered steps with connector lines, active/done/pending visual states); Back/Continue nav bar at bottom of left column; stage 4 has no Continue button; `useEffect` resets `canAdvance=true` when navigating to stages 0, 1, 3
- Fixed `packages/types/package.json`: changed `"require"` export condition to `"default"` — Vite resolves ESM packages via `"default"` or `"import"` conditions, not `"require"`. The dist output is ESM (module: ESNext), so `"default"` is correct. This was triggered by `configStore.ts` being the first file in the frontend to import an actual value (not a type) from `@ds-gen/types`.

**Decisions made:**

- `projectName` in `uiStore`, not `configStore` — per task spec: project name is UI/flow state, not generation config.
- `useConfigStore.getState()` in the READY handler — reads current config imperatively inside an event handler rather than closing over a potentially stale value from the mount-time closure.
- Stage 3 `setCanAdvance` side effect is in the component, not the page — the page resets `canAdvance=true` on stage change, and each stage component is responsible for its own advancement condition.

**Verification:**
- `tsc --noEmit` in `frontend/`: zero errors
- `npx playwright test`: 7/7 pass (no regressions)

---

## 2026-05-02 — Task 2.1: Preview sandbox

**What was done:**

- Updated `preview-sandbox/package.json`: added `chroma-js` and `@types/chroma-js` as deps; removed `tailwindcss` and `cva` (not needed in the sandbox); added `@types/react-dom`
- Updated `preview-sandbox/vite.config.ts`: set `base: '/preview/'`, added Vite `resolve.alias` for `@ds-gen/types` → `../packages/types/src/index.ts` and `@pipeline` → `../backend/src/pipeline`, set `build.outDir: 'dist'`
- Updated `preview-sandbox/tsconfig.json`: added `paths` for `@ds-gen/types` and `@pipeline/*` so `tsc --noEmit` resolves aliases; removed `rootDir`/`outDir` (noEmit is inherited from base); included `vite.config.ts` in the type check
- Created `preview-sandbox/index.html`: minimal entry with Google Fonts preload for Inter, Plus Jakarta Sans, Source Sans 3, Playfair Display, Source Serif 4, JetBrains Mono, Fira Code; script src is `/src/main.tsx` (Vite prepends base during build)
- Created `preview-sandbox/src/main.tsx`: mounts `<TokenApplicator />` in StrictMode
- Created `preview-sandbox/src/generatePreviewTokens.ts`: imports `generateColorScale` and data maps from `@pipeline/palette/generator` and `@pipeline/palette/personalities`; maps config to CSS custom properties for primary scale (19 steps), neutral scale, fonts, spacing-base, radii (4 values), shadows (3 values); returns `:root { ... }` string — no network calls, synchronous
- Created `preview-sandbox/src/TokenApplicator.tsx`: sends `READY` postMessage on mount; listens for `CONFIG_UPDATE`; calls `generatePreviewTokens(config)` and writes to `<style id="ds-preview-tokens">`; renders `<SystemPreviewLayout>`
- Created `preview-sandbox/src/SystemPreviewLayout.tsx`: 6 sections — primary color strip, neutral color strip, type scale (8 steps, computed from scaleRatio), component strip (primary button, secondary button, input, badge), radius swatches, shadow swatches; all values via CSS custom properties
- Removed stub `preview-sandbox/src/index.ts`
- Updated `frontend/vite.config.ts`: added `/preview` proxy → `http://localhost:5174` for dev (with path rewrite stripping `/preview` prefix)

**Decisions made:**

- Used `@pipeline` as a Vite alias (not relative `../../backend/...` imports) to avoid `rootDir` conflicts with `tsc --noEmit`. Both vite.config alias and tsconfig paths set the same mapping.
- `generatePreviewTokens` uses the same `generateColorScale` function as the server pipeline — no duplication, guaranteed identical output.
- `COLOR_DIRECTION_HEX` mapping defined in `generatePreviewTokens.ts` (same values will be referenced by Task 2.3).
- Google Fonts are loaded in `index.html` (not inside `generatePreviewTokens`) — font loading via network is OK in the HTML, only forbidden inside the token generator function.
- `index.html` script src uses `/src/main.tsx` (not `/preview/src/main.tsx`) — Vite prepends the `base` path during build automatically; including it manually caused build failure.

**Verification:**
- `npm run typecheck` in `preview-sandbox/`: zero errors
- `npm run build` in `preview-sandbox/`: 130 modules, dist/assets/index-*.js 239 kB — clean
- `cd backend && npm test`: 269/269 pass (no regressions)
- `cd frontend && npx playwright test`: 7/7 pass (no regressions)

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
