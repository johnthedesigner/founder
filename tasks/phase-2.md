# Phase 2 — Creation Flow

> **Status:** Complete ✓
> **Depends on:** Phase 1b complete (all tasks `[x]`, 269 backend tests + 7 Playwright tests passing)
> **Reference:** `docs/design-system-plan-summary.md` § Phase 2 — Creation Flow

---

## Overview

The full four-stage creation flow and live System Preview. A user who arrives at `/new` immediately sees a rendered design system. Every choice they make updates the preview within 500ms. At Stage 4, the project is saved anonymously and a shareable URL is presented. The user can download a ZIP without an account.

The creation flow reads from and writes to `configStore`. The System Preview is a separate Vite application (`preview-sandbox/`) that runs in an iframe and communicates via `postMessage`. Config is persisted to `localStorage` for anonymous users so a page refresh does not lose progress.

This phase has seven tasks: the preview sandbox, the flow shell and SystemPreview wrapper, Stages 1–4, and Playwright tests. Phase 3 will wire in account creation and auto-save; this phase focuses on making the flow complete and downloadable for anonymous users.

---

## Tasks

### Task 2.1 — Preview sandbox

> **Status:** `[x]` Complete
> **Session:** —
> **Depends on:** Phase 1b complete

**What this task implements:**
The `preview-sandbox/` Vite application — a separate build that runs inside an iframe in the main app. It listens for `CONFIG_UPDATE` postMessage events, applies generated CSS custom properties to `:root`, and renders a live component strip that reacts immediately to config changes.

**Files to create:**
- `preview-sandbox/package.json` — standalone Vite app; deps: React, Base UI (`@base-ui-components/react`), `@ds-gen/types`
- `preview-sandbox/index.html` — minimal entry point
- `preview-sandbox/vite.config.ts` — builds to `preview-sandbox/dist/`; base: `/preview/`
- `preview-sandbox/src/main.tsx` — sets up message listener; renders `<TokenApplicator />`
- `preview-sandbox/src/generatePreviewTokens.ts` — converts `ProjectConfig` to a CSS string with `:root { --token-name: value; ... }`
- `preview-sandbox/src/TokenApplicator.tsx` — writes generated CSS to a `<style id="ds-preview-tokens">` on `:root`; re-renders `SystemPreviewLayout` when config changes
- `preview-sandbox/src/SystemPreviewLayout.tsx` — the visible preview: color palette strips, type scale, component strip, spacing swatches

**postMessage protocol:**
- Sandbox → parent (on mount): `{ type: 'READY' }`
- Parent → sandbox: `{ type: 'CONFIG_UPDATE', config: ProjectConfig }`
- Sandbox processes `CONFIG_UPDATE`: calls `generatePreviewTokens(config)`, writes CSS to `<style>` tag, re-renders layout

**`generatePreviewTokens(config: ProjectConfig): string`:**
Returns a CSS string: `:root { ... }` containing all CSS custom properties needed to style the preview. Must produce at minimum:
- `--color-primary-{50,100,200,...,950}` — primary hue color scale from `config.color`
- `--color-neutral-{50,100,...,950}` — neutral scale from `config.color.neutralFamily`
- `--font-display`, `--font-body`, `--font-code` — from `config.typography` type style
- `--font-scale-ratio` — from `config.typography.scaleRatio`
- `--spacing-base` — from `config.shape.density` (compact=3px, balanced=4px, spacious=5px)
- `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-full` — from `config.shape.personality`
- `--shadow-sm`, `--shadow-md`, `--shadow-lg` — from `config.shape.dimensionality` (flat → all `none`)

Color scale generation: derive from `config.color.primaryHex` if `source === 'provided'`, or from the preset hex for the `colorDirection` if `source === 'generated'`. Use the same OKLCH algorithm that the server pipeline uses — the pipeline functions are pure TypeScript with no Node.js APIs, so they are importable in the browser from `../../backend/src/pipeline/palette/`. Use a Vite alias or relative import; confirm `tsc --noEmit` still passes.

**`SystemPreviewLayout.tsx`:**
Shows four sections, each using CSS custom properties via `var(--token-name)`:
1. **Color strip** — primary scale swatches (50–950) as horizontal color chips, labeled with the step number
2. **Type scale** — one line of text per scale step rendered at its actual size, labeled "display-lg / 32px" etc.
3. **Component strip** — Button (primary + secondary variants, md size), a labeled input field, a Badge (primary variant)
4. **Radius swatches** — four squares showing sm/md/lg/full

All elements must use CSS custom properties. No hardcoded color values in the component code.

**`vite.config.ts` for the main frontend:**
Serve the preview sandbox dist during dev. Add:
```typescript
server: {
  proxy: {
    '/preview': { target: 'http://localhost:5174', ... }  // preview-sandbox dev server
  }
}
```
For production, the preview dist is a static folder served by the frontend's static server. This wiring is for dev only.

**Acceptance criteria:**
- [ ] `cd preview-sandbox && npm run dev` — sandbox loads at `http://localhost:5174`
- [ ] Opening the sandbox URL directly shows the default design system preview
- [ ] Posting `{ type: 'CONFIG_UPDATE', config: { ...DEFAULT_CONFIG, color: { ...DEFAULT_CONFIG.color, primaryHex: '#e63946' } } }` from the browser console updates the color strip immediately
- [ ] Setting `dimensionality: 'flat'` in a config update removes all shadow values from the CSS custom properties
- [ ] `cd preview-sandbox && npm run build` — builds to `dist/` with no errors
- [ ] `tsc --noEmit` in `preview-sandbox/` — zero errors
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- Must not make network requests inside `generatePreviewTokens` — it must run synchronously and offline
- Must not render component code strings as text — the preview renders actual React components styled with CSS custom properties
- Must not import from `backend/src/api/` or `backend/src/services/` — only pure pipeline functions are in scope

---

### Task 2.2 — Creation flow shell + SystemPreview wrapper

> **Status:** `[x]` Complete
> **Session:** —
> **Depends on:** Task 2.1

**What this task implements:**
The `/new` page layout and navigation shell that hosts all four stages. The `SystemPreview` component wraps the preview sandbox iframe and manages the `postMessage` bridge. Config is persisted to `localStorage` so page refreshes preserve progress. The `uiStore` gains stage navigation state.

**Files to create or modify:**
- `frontend/src/components/preview/SystemPreview.tsx` — new component: iframe + bridge
- `frontend/src/components/NewProjectPage.tsx` — rewrite from stub; the stage layout shell
- `frontend/src/store/configStore.ts` — add `localStorage` persistence and `setProjectName`
- `frontend/src/store/uiStore.ts` — add `projectName: string`, `setProjectName`, `canAdvance: boolean`, `setCanAdvance`

**`SystemPreview.tsx`:**
```typescript
// Props: none. Reads configStore directly.
export function SystemPreview() {
  // 1. Creates an <iframe src="/preview/index.html" />
  // 2. On mount, listens for { type: 'READY' } from the iframe; sets ready=true
  // 3. Subscribes to configStore; on change, debounces 50ms,
  //    posts { type: 'CONFIG_UPDATE', config } to iframe.contentWindow
  // 4. While !ready, shows a skeleton placeholder (grey boxes matching the layout)
  // 5. If READY is not received within 3s, shows a static fallback (simple color strip)
}
```

**`NewProjectPage.tsx` shell:**
- Two-column layout: left column = stage content, right column = `SystemPreview` (sticky, full height)
- Stage progress indicator at the top: four labeled steps (Foundation, Style, Review, Export); current step is highlighted
- Renders `<Stage1 />`, `<Stage2 />`, `<Stage3 />`, or `<Stage4 />` based on `uiStore.currentStage`
- Back button (disabled on Stage 1): calls `uiStore.goBack()`
- Continue button: disabled when `!uiStore.canAdvance`; calls `uiStore.advance()`
- Stage 1 advance condition: `config.projectType` is set (always true, since it has a default)
- Stage 2 advance condition: all four axes have values (always true, since all have defaults)
- Stage 3 advance condition: `uiStore.projectName.trim().length > 0`
- Stage 4: no Continue button (final stage); Back button still works

**`configStore.ts` updates:**
- On store init, read `localStorage['ds-gen-flow-config']` (if present and valid JSON matching `ProjectConfigSchema`); initialize store from it
- On every `setConfig` call, write updated config back to `localStorage['ds-gen-flow-config']`
- Add `resetConfig()` that also clears `localStorage['ds-gen-flow-config']`

**`uiStore.ts` updates:**
- Add: `projectName: string` (default `'My Design System'`), `setProjectName(name: string)`
- Add: `canAdvance: boolean` (default `true`), `setCanAdvance(v: boolean)` — set by each stage component
- Add: `advance()` — increments `currentStage` (max 3), `goBack()` — decrements (min 0)
- Keep existing `currentStage`, `isSaving`, `lastSavedAt`

**`App.tsx`:** Route `/new` must no longer require auth. Remove any auth guard on `/new`.

**Acceptance criteria:**
- [ ] Navigating to `/new` without being logged in shows the creation flow (no redirect to `/login`)
- [ ] Four-stage progress indicator renders; current stage is visually distinct
- [ ] "Continue" advances to the next stage; "Back" goes back
- [ ] `SystemPreview` iframe renders (loading skeleton while preview sandbox initializes; actual preview once READY received)
- [ ] Changing config via `setConfig` in the browser console triggers a `CONFIG_UPDATE` postMessage to the iframe within 100ms (verify via `window.addEventListener('message', ...)` in iframe)
- [ ] Refreshing `/new` mid-flow restores the config from `localStorage`
- [ ] `tsc --noEmit` in `frontend/`: zero errors
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- Must not add auth guard to the `/new` route — the creation flow is fully anonymous
- Must not store `projectName` in `configStore` — it's UI/flow state, not generation config. `projectName` lives in `uiStore`.

---

### Task 2.3 — Stage 1: Foundation

> **Status:** `[x]` Complete
> **Session:** —
> **Depends on:** Task 2.2

**What this task implements:**
The complete Stage 1 UI: project type selection, scope chips with customize disclosure, brand asset input (starting fresh vs. provided), color direction selection, and light/dark mode selection. All choices update `configStore` and the System Preview reacts within 500ms.

**Files to create:**
- `frontend/src/components/flow/Stage1.tsx` — main Stage 1 component
- `frontend/src/components/flow/Stage1ProjectType.tsx` — three project type selection cards
- `frontend/src/components/flow/Stage1BrandAssets.tsx` — brand assets toggle + optional inputs
- `frontend/src/components/flow/Stage1ColorDirection.tsx` — five color direction cards (starting fresh only)
- `frontend/src/components/flow/Stage1ModeSelect.tsx` — three-option mode selection

**Scope defaults by project type** (from spec):
```typescript
const SCOPE_DEFAULTS: Record<ProjectType, ComponentCategory[]> = {
  saas:       ['forms', 'navigation', 'overlays', 'feedback', 'data-display', 'layout'],
  marketing:  ['forms', 'navigation', 'feedback', 'layout'],
  mobile:     ['forms', 'navigation', 'feedback', 'layout'],
}
```

**Color direction → `primaryHex` mapping:**
```typescript
const COLOR_DIRECTION_HEX: Record<ColorDirection, string> = {
  'cool-professional':    '#3b82f6',
  'warm-approachable':    '#f59e0b',
  'bold-high-contrast':   '#dc2626',
  'neutral-minimal':      '#6b7280',
  'earth-tones':          '#92400e',
}
```

**Stage 1 behavior:**
- Project type card selection: calls `setConfig({ projectType, componentScope: SCOPE_DEFAULTS[projectType] })`
- Scope chips: each chip shows a category. "Customize" expands a checklist; toggling a chip calls `setConfig({ componentScope: [...updated] })`. At least 1 category must remain selected.
- Brand assets toggle: choosing "I have brand assets" sets `config.color.source = 'provided'` and reveals hex + typeface inputs. Hex input validates against the `#RRGGBB` pattern; on valid input, calls `setConfig({ color: { ...color, primaryHex: hex, source: 'provided' } })`. Choosing "Starting fresh" resets to `source: 'generated'` and shows the color direction cards.
- Color direction cards (starting fresh): on select, calls `setConfig({ color: { ...color, colorDirection: dir, primaryHex: COLOR_DIRECTION_HEX[dir] } })`
- Mode selection: on select, calls `setConfig({ modes: selection })`
- Each change triggers preview update automatically via the `configStore` → `SystemPreview` subscription

**Acceptance criteria:**
- [ ] Clicking "Marketing Site" updates the scope chips to show 4 categories (no Overlays, no Data Display)
- [ ] Clicking "SaaS / Web App" restores 6 scope chips
- [ ] "Customize" expands the checklist; unchecking a category removes its chip
- [ ] Selecting "Warm & Approachable" color direction updates the System Preview primary color to amber within 500ms
- [ ] "I have brand assets" reveals hex input; entering `#e63946` updates the System Preview primary color
- [ ] Mode select shows three options; selecting "Both" shows a note that dual-mode tokens will be generated
- [ ] `tsc --noEmit` in `frontend/`: zero errors
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- Must not validate the hex input on every keypress — validate on blur or when the hex is a valid 6-digit value
- Must not show the color direction cards when "I have brand assets" is selected — they are mutually exclusive

---

### Task 2.4 — Stage 2: Style

> **Status:** `[x]` Complete
> **Session:** —
> **Depends on:** Task 2.3

**What this task implements:**
Stage 2: four personality axis sections (Density, Personality, Type Style, Dimensionality). Each has a row of visual selection cards showing a label, visual character, and short description. Each axis has a "Customize" disclosure with fine-grained controls. All choices update `configStore`.

**Files to create:**
- `frontend/src/components/flow/Stage2.tsx` — main Stage 2 component
- `frontend/src/components/flow/Stage2AxisSection.tsx` — reusable axis section (label row + cards + customize disclosure)
- `frontend/src/components/flow/Stage2AxisCard.tsx` — single visual option card with selected state
- `frontend/src/components/flow/Stage2CustomizeDensity.tsx` — fine-grained density: base spacing unit input (1–8px) + derived scale preview
- `frontend/src/components/flow/Stage2CustomizeTypography.tsx` — fine-grained type: font face inputs for display, body, code; scale ratio select

**Axis card display values:**

_Density:_

| Value | Label | Subtitle |
|---|---|---|
| `compact` | Compact | 3px base unit |
| `balanced` | Balanced | 4px base unit (default) |
| `spacious` | Spacious | 5px base unit |

_Personality:_

| Value | Label | Subtitle |
|---|---|---|
| `professional` | Professional | Muted, clear hierarchy |
| `approachable` | Approachable | Rounded, friendly |
| `bold` | Bold | High contrast, assertive |
| `minimal` | Minimal | Quiet, near-neutral |

_Type Style:_

| Value | Label | Subtitle |
|---|---|---|
| `geometric` | Geometric | Inter · 1.25× |
| `humanist` | Humanist | Plus Jakarta Sans · 1.25× |
| `serif-accented` | Serif-accented | Fraunces · 1.2× |
| `monospace-accented` | Monospace-accented | JetBrains Mono · 1.333× |

Render each type card with its actual display font preloaded from Google Fonts (a `<link>` in `index.html` for Inter, Plus Jakarta Sans, Fraunces). The subtitle shows the font name and scale ratio.

_Dimensionality:_

| Value | Label | Subtitle |
|---|---|---|
| `flat` | Flat | No shadows, borders only |
| `subtle` | Subtle | Soft shadows (default) |
| `dimensional` | Dimensional | Pronounced depth |

**Axis → configStore mapping:**
- Density → `config.shape.density`
- Personality → `config.shape.personality`
- Type Style → `config.typography.typeStyle`; also sets `displayFace`, `bodyFace`, `codeFace`, `scaleRatio` to the defaults for the selected style (see spec table)
- Dimensionality → `config.shape.dimensionality`

**Type style font defaults:**
```typescript
const TYPE_STYLE_DEFAULTS: Record<TypeStyle, Pick<TypographyConfig, 'displayFace' | 'bodyFace' | 'codeFace' | 'scaleRatio'>> = {
  geometric:           { displayFace: 'Inter',              bodyFace: 'Inter',             codeFace: 'JetBrains Mono', scaleRatio: 1.25 },
  humanist:            { displayFace: 'Plus Jakarta Sans',  bodyFace: 'Inter',             codeFace: 'JetBrains Mono', scaleRatio: 1.25 },
  'serif-accented':    { displayFace: 'Fraunces',           bodyFace: 'Inter',             codeFace: 'JetBrains Mono', scaleRatio: 1.2 },
  'monospace-accented':{ displayFace: 'Inter',              bodyFace: 'JetBrains Mono',    codeFace: 'JetBrains Mono', scaleRatio: 1.333 },
}
```

**Customize disclosures:**
- Each axis has a "Customize" button that toggles a smooth expand/collapse panel
- Only the density and typography customize panels are required for Phase 2. Personality and dimensionality customize panels may show "Advanced customization coming soon."
- Density: number input (1–8, step 0.5) for the base spacing unit; `setConfig({ shape: { density: ... } })` and update preview. Show a derived scale preview: 8 steps labeled `space-1` through `space-8` with computed px values.
- Typography: text inputs for `displayFace`, `bodyFace`, `codeFace`; select for `scaleRatio` (1.2 / 1.25 / 1.333)

**Acceptance criteria:**
- [ ] All four axis rows render with the correct cards and defaults pre-selected
- [ ] Selecting "Compact" density updates the System Preview spacing within 500ms
- [ ] Selecting "Serif-accented" type style updates the System Preview display text to Fraunces
- [ ] Selecting "Flat" dimensionality removes shadow values from the preview's CSS custom properties
- [ ] "Customize" on Density expands to show a base unit input and derived scale
- [ ] `tsc --noEmit` in `frontend/`: zero errors
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- Must not implement the Personality or Dimensionality fine-grained customization panels — use a "coming soon" placeholder
- Must not allow deselecting all axis options — each axis must always have exactly one selected value

---

### Task 2.5 — Stage 3: Review

> **Status:** `[x]` Complete
> **Session:** —
> **Depends on:** Task 2.4

**What this task implements:**
Stage 3 is the review stage. The System Preview takes the primary position. A token summary shows all generated token layers in collapsible sections with a "View raw JSON" toggle. The user enters a project name. Continue is disabled until a non-empty name is entered.

**Files to create:**
- `frontend/src/components/flow/Stage3.tsx` — main Stage 3 component
- `frontend/src/components/flow/Stage3TokenSummary.tsx` — collapsible token tree with raw JSON toggle
- `frontend/src/components/flow/Stage3ProjectName.tsx` — name input wired to `uiStore.setProjectName`

**Stage 3 layout:**
- System Preview occupies the full right column (same position as in all stages, via the shell)
- Left column contains:
  1. `Stage3ProjectName` — text input, label "Project name", placeholder "My Design System"; on change calls `uiStore.setProjectName(value)`; when empty, sets `uiStore.setCanAdvance(false)`; when non-empty, sets `uiStore.setCanAdvance(true)`
  2. `Stage3TokenSummary` — shows the output of calling `generate(configStore.config)` on the client; display the token counts per layer (e.g. "42 primitives · 28 semantic tokens · 16 component tokens")
  3. "Back to adjust" links: clicking takes the user back to Stage 1 or Stage 2 (calls `uiStore.setCurrentStage(0)` or `uiStore.setCurrentStage(1)`)

**`Stage3TokenSummary`:**
- Call `generate(config)` from the backend pipeline (already used by the server, importable in frontend via the workspace alias or direct relative import — confirm it is browser-safe, i.e. no Node.js-only imports). If `generate` is not browser-safe, display a static placeholder summary with counts from the preview sandbox's CSS variables instead.
- Three collapsible sections: Primitives, Semantic, Components
- Each section: a summary line ("42 primitive tokens across 6 scales") + a collapsed list of token names and values
- "View raw JSON" toggle per section: reveals the full W3C DTCG JSON output for that layer (formatted, scrollable `<pre>`)

**Continue gate:**
- `uiStore.canAdvance` is set to `false` when `Stage3.tsx` mounts (name input is empty initially)
- `uiStore.setCanAdvance(true)` is called when the name input has a non-empty trimmed value
- On unmount, set `canAdvance` back to `true` (so stage 1/2 don't inherit the false state)

**Acceptance criteria:**
- [ ] Stage 3 renders with System Preview visible and the project name input focused
- [ ] Entering a project name enables the "Continue" button
- [ ] Clearing the project name disables "Continue"
- [ ] Token summary shows at least the section headers for Primitives, Semantic, and Components
- [ ] "View raw JSON" reveals formatted JSON output
- [ ] `tsc --noEmit` in `frontend/`: zero errors
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- Must not call the backend API in Stage 3 — any token generation for display purposes runs client-side
- Must not block rendering while token generation runs — if `generate()` is slow, show a spinner or static placeholder while it completes

---

### Task 2.6 — Stage 4: Export and anonymous project save

> **Status:** `[x]` Complete
> **Session:** —
> **Depends on:** Task 2.5

**What this task implements:**
Stage 4 creates the anonymous project and presents the shareable URL, the ZIP download, and the CLI/Figma CTAs. The project is created via `POST /projects` when the user clicks "Save project" or "Download package" — whichever happens first. The `ownerToken` is stored in `anonymousStore`. A "Your project is saved" message shows the shareable URL.

**Files to create:**
- `frontend/src/components/flow/Stage4.tsx` — main Stage 4 component

**Stage 4 layout and behavior:**

**Project save (on "Download package" or "Save project" click):**
1. If `uiStore.savedProjectId` is null, call `createProject({ name: uiStore.projectName, config: configStore.config })`
2. On success: store `project.id` in `uiStore.savedProjectId` (new field); `ownerToken` is stored in `anonymousStore` by `createProject` automatically
3. Show "Your design system is saved at `/projects/:id`" with a copy-link button
4. Proceed to the ZIP download (step 5)
5. For ZIP download: call `GET /projects/:id/export.zip` (via fetch with `responseType: blob`) and trigger a browser download named `<projectName>.zip`

**CTAs:**
- **"Download package"** — primary CTA button (blue). On click: save project if not saved, then download ZIP.
- **"Use the CLI"** — secondary CTA. Shows the command `npx @ds-gen/cli init --project=<id>` in a copyable code block. If the project hasn't been saved yet, clicking first saves it. CLI requires an account (show "Requires an account — sign in to use the CLI" beneath the command, grayed out).
- **"Figma setup"** — link/button. Opens a modal or navigates to a simple guide: 3 steps with brief instructions for the Tokens Studio import. No screenshots required in Phase 2.

**Account prompt (below CTAs):**
A soft banner: "Create a free account to manage this project." Two links: "Create account" (navigates to `/register`) and "Sign in" (navigates to `/login`). This prompt does NOT block the download. Phase 3 will wire account creation back to the project.

**`uiStore` additions needed:**
- `savedProjectId: string | null` (default `null`)
- `setSavedProjectId(id: string)`

**`configStore` cleanup:**
After a successful project save, call `configStore.resetConfig()` to clear `localStorage['ds-gen-flow-config']`. The project is now saved on the server; the local draft is no longer needed.

**Acceptance criteria:**
- [ ] Clicking "Download package" on Stage 4 creates an anonymous project (`POST /projects`, no auth cookie) and saves `ownerToken` to `anonymousStore` / `localStorage`
- [ ] The ZIP file downloads and contains a non-empty `tokens/` directory when inspected
- [ ] The shareable URL `/projects/<id>` is shown and clicking it navigates to the project page (which shows the "You own this" badge since `ownerToken` is in the store)
- [ ] The CLI command block shows the project ID and has a copy button
- [ ] The Figma setup button opens a guide or placeholder modal
- [ ] After download, `localStorage['ds-gen-flow-config']` is cleared
- [ ] `tsc --noEmit` in `frontend/`: zero errors
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- Must not implement account creation in Stage 4 — the "Create account" and "Sign in" links simply navigate to `/register` and `/login`. Account integration is Phase 3.
- Must not call `POST /projects` more than once per flow session — check `uiStore.savedProjectId` before calling
- Must not redirect away from Stage 4 after save — the user should stay on the page to download and share

---

### Task 2.7 — Playwright Phase 2 tests

> **Status:** `[x]` Complete
> **Session:** —
> **Depends on:** Task 2.6

**What this task implements:**
Playwright e2e tests for the creation flow, covering the Journey 1 and Journey 6 steps in `docs/user-journeys.md`.

**Files to create:**
- `frontend/tests/e2e/phase-2.spec.ts` — 5 tests

**Test cases:**

1. **Default state: preview renders on arrival** (journey 1.1.1–1.1.2):
   Navigate to `/new`. Assert the System Preview iframe is visible. Assert the progress indicator shows Stage 1 active. Assert the "SaaS / Web App" project type card is in a selected/active state. Wait for the preview iframe to post `READY` (listen via `page.evaluate` to check `window.__previewReady` set by the bridge). Assert the System Preview iframe is showing content (not blank).

2. **Project type change updates scope chips** (journey 1.2.1):
   Navigate to `/new`. Assert 6 scope chips are visible. Click "Marketing Site." Assert the scope chips now show exactly 4 chips (no "Overlays" chip, no "Data Display" chip).

3. **Color direction change updates preview** (journey 1.2.6):
   Navigate to `/new`. Note the initial primary color CSS variable from the preview iframe: `await page.frameLocator('iframe[src*="preview"]').evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-primary-500'))`. Click "Warm & Approachable." Assert that the `--color-primary-500` CSS variable changes to an amber/orange value (hue between 30° and 50° in HSL, or simply that it changed from the initial blue).

4. **Personality axis selection updates preview** (journey 1.3.2–1.3.5):
   Navigate to `/new`. Advance to Stage 2. Select "Compact" density. Assert the preview's `--spacing-base` CSS variable changes. Select "Serif-accented" type style. Assert the display font in the preview changes (the type-scale section renders text in Fraunces — check that `font-family` on the display element includes "Fraunces"). Select "Flat" dimensionality. Assert `--shadow-sm` is `none` in the preview.

5. **Complete flow → download ZIP** (journey 1.5.2–1.5.3):
   Navigate to `/new`. Stage 1: defaults (no changes needed — advance condition is met). Advance to Stage 2. Advance (all axes have defaults). Advance to Stage 3. Enter "E2E Test System" in the project name field. Advance to Stage 4. Click "Download package." Assert a download is triggered (`page.waitForEvent('download')`). Assert the downloaded file has a `.zip` extension. Assert `localStorage['ds-gen-anonymous']` has an entry (project was saved).

**Note on postMessage and iframe access:** The Playwright `frameLocator` API can access the iframe's DOM. Use `page.frameLocator('iframe[src*="preview"]')` to query elements inside the preview sandbox. For CSS custom properties on `:root`, use `page.frameLocator(...).evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--token-name'))`.

**Acceptance criteria:**
- [ ] `cd frontend && npx playwright test phase-2` — all 5 tests pass
- [ ] All Phase 1 and Phase 1b Playwright tests still pass (0 regressions)
- [ ] Journey steps 1.1.1–1.1.2, 1.2.1, 1.2.6, 1.3.2–1.3.5, 1.5.2–1.5.3 are covered
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- Must not use `page.waitForTimeout` — use `waitForSelector`, `waitForFunction`, or event-based waiting instead
- Must not test the `generate()` pipeline output directly — that is covered by the existing backend tests

---

## Phase 2 completion checklist

Before starting Phase 3, verify all of the following:

- [x] All tasks above marked `[x]` complete
- [x] `cd backend && npm test` — 269/269 pass
- [x] `cd frontend && npx playwright test` — 12/12 pass (5 Phase 2 + 7 Phase 1/1b)
- [x] `tsc --noEmit` in `packages/types`, `backend`, `frontend`, and `preview-sandbox` — all zero errors
- [x] `eslint src` in `backend` and `frontend` — zero errors
- [x] `cd preview-sandbox && npm run build` — clean dist (33 modules, 239 kB)
- [x] ZIP contains `tokens/`, `components/`, `docs/` directories — verified programmatically (33 files)
- [x] Color direction change updates preview — covered by test 1.3 (CSS variable check in iframe)
- [x] Anonymous save + shareable URL — covered by tests 1.5 and Phase 1b suite
- [x] Phase retrospective written to `docs/phase-2-retro.md`
- [x] `docs/user-journeys.md` updated for Phase 3 scope
- [x] `docs/design-system-plan-summary.md` updated to mark Phase 2 Complete
- [x] `AGENTS.md` updated with new patterns from Phase 2
- [x] Session log archived to `logs/phase-2.md`

---

## Completed task log

*(Tasks are compressed to this format once complete. Full details live in the session log.)*

<!--
### Task 2.X — [Task name] ✓
**Output:** [One sentence: what was built.]
**Key decisions:** [Any non-obvious choices made.]
**Session:** [Date / SESSION_LOG pointer]
-->
