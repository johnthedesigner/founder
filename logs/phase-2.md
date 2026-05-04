# Session Log Archive — Phase 2: Creation Flow

> Archived from SESSION_LOG.md on 2026-05-03

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
- Rewrote `frontend/src/components/NewProjectPage.tsx`: full-height two-column layout; stage progress indicator (numbered steps with connector lines, active/done/pending visual states); Back/Continue nav bar at bottom of left column; stage 4 has no Continue button; `useEffect` resets `canAdvance=true` when navigating to stages 0, 1, 3
- Fixed `packages/types/package.json`: changed `"require"` export condition to `"default"` — Vite resolves ESM packages via `"default"` or `"import"` conditions, not `"require"`.

**Decisions made:**

- `projectName` in `uiStore`, not `configStore` — per task spec: project name is UI/flow state, not generation config.
- `useConfigStore.getState()` in the READY handler — reads current config imperatively inside an event handler rather than closing over a potentially stale value from the mount-time closure.

**Verification:**
- `tsc --noEmit` in `frontend/`: zero errors
- `npx playwright test`: 7/7 pass (no regressions)

---

## 2026-05-02 — Task 2.1: Preview sandbox

**What was done:**

- Updated `preview-sandbox/package.json`: added `chroma-js` and `@types/chroma-js` as deps; removed `tailwindcss` and `cva` (not needed in the sandbox); added `@types/react-dom`
- Updated `preview-sandbox/vite.config.ts`: set `base: '/preview/'`, added Vite `resolve.alias` for `@ds-gen/types` and `@pipeline`, set `build.outDir: 'dist'`, `server.port: 5180`, `server.strictPort: true`
- Updated `preview-sandbox/tsconfig.json`: added `paths` for `@ds-gen/types` and `@pipeline/*`; removed `rootDir`/`outDir`
- Created `preview-sandbox/index.html`: minimal entry with Google Fonts preload; script src `/src/main.tsx`
- Created `preview-sandbox/src/main.tsx`: mounts `<TokenApplicator />` in StrictMode
- Created `preview-sandbox/src/generatePreviewTokens.ts`: imports `generateColorScale` and data maps from `@pipeline/palette/`; maps config to CSS custom properties; returns `:root { ... }` string — no network calls, synchronous
- Created `preview-sandbox/src/TokenApplicator.tsx`: sends `READY` postMessage on mount; listens for `CONFIG_UPDATE`; calls `generatePreviewTokens(config)` and writes to `<style id="ds-preview-tokens">`; renders `<SystemPreviewLayout>`
- Created `preview-sandbox/src/SystemPreviewLayout.tsx`: 6 sections — primary color strip, neutral color strip, type scale (8 steps), component strip (primary button, secondary button, input, badge), radius swatches, shadow swatches

**Decisions made:**

- Used `@pipeline` as a Vite alias to avoid `rootDir` conflicts with `tsc --noEmit`.
- `generatePreviewTokens` uses the same `generateColorScale` function as the server pipeline — no duplication, guaranteed identical output.
- `index.html` script src uses `/src/main.tsx` — Vite prepends `base` during build automatically; including the prefix manually caused build failure.

**Verification:**
- `npm run typecheck` in `preview-sandbox/`: zero errors
- `npm run build` in `preview-sandbox/`: 130 modules, dist/assets/index-*.js 239 kB — clean
- `cd backend && npm test`: 269/269 pass (no regressions)
- `cd frontend && npx playwright test`: 12/12 pass
