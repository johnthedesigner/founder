# Phase 2 — Creation Flow

> **Status:** Not started
> **Depends on:** Phase 1 complete (all tasks marked `[x]`, 251 backend tests + 3 Playwright tests passing)
> **Reference:** `docs/design-system-dev-plan.md` § Phase 2 — Creation Flow

---

## Overview

The full four-stage creation flow is implemented. Users can choose a project type, set color direction, tune personality axes, review a live preview of their design system, and download a ZIP — all without an account. The System Preview is a live iframe sandbox that updates within 500ms of any config change via postMessage. Anonymous users can complete the flow and download from Stage 4 via a new public export endpoint. This phase has one backend task (the anonymous export endpoint) and seven frontend tasks.

---

## Tasks

### Task 2.1 — Anonymous export endpoint

> **Status:** `[ ]` Not started
> **Session:** —
> **Depends on:** none (Phase 1 complete)

**What this task implements:**
A new public backend route `POST /api/v1/export` that accepts a `ProjectConfig` body and returns a ZIP download. No authentication required. This is the endpoint Stage 4 uses for anonymous users.

**Files to create or modify:**
- `backend/src/api/generate.ts` — add `POST /` route to `agentRouter` (or a new `publicExportRouter`); Zod-validate the request body against `ProjectConfigSchema`; call `generate(config)`; stream the ZIP
- `backend/src/app.ts` — mount the new route (if using a separate router)
- `backend/tests/api/generate.test.ts` — add tests for the new route

**Acceptance criteria:**
- [ ] `POST /api/v1/export` with a valid `ProjectConfig` body returns HTTP 200 with `Content-Type: application/zip` and a non-empty ZIP
- [ ] `POST /api/v1/export` with an invalid body returns HTTP 400 with a `{ error, issues }` JSON response
- [ ] No `Authorization` header or session cookie is required
- [ ] The ZIP contents match the shape returned by the existing authenticated `GET /projects/:id/export.zip` (same file tree)
- [ ] Existing generate tests still pass — 0 regressions
- [ ] `npm test` in `backend/` passes
- [ ] `tsc --noEmit` in `backend/` passes
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- Must not require auth — this endpoint is explicitly public
- Must not store anything in the database — it is stateless, config in → ZIP out
- Must not modify the existing authenticated export routes

---

### Task 2.2 — Preview sandbox Vite app

> **Status:** `[ ]` Not started
> **Session:** —
> **Depends on:** none (Phase 1 complete)

**What this task implements:**
A separate Vite + React application in `preview-sandbox/` that renders a live preview of a design system. It listens for `CONFIG_UPDATE` postMessages, computes CSS custom properties via a client-side `generatePreviewTokens(config)` function, writes them to `:root`, and re-renders a `SystemPreviewLayout` component. Posts `{ type: 'READY' }` to the parent on mount.

**Files to create or modify:**
- `preview-sandbox/package.json` — `@ds-gen/preview-sandbox`; deps: react, react-dom, `@ds-gen/types`; devDeps: vite, @vitejs/plugin-react, typescript
- `preview-sandbox/tsconfig.json` — extends root tsconfig.base.json
- `preview-sandbox/vite.config.ts` — builds to `preview-sandbox/dist/`; base: `/preview/` for production; dev port: 5174
- `preview-sandbox/index.html` — Vite entry
- `preview-sandbox/src/main.tsx` — React entry, mounts `<PreviewApp />`
- `preview-sandbox/src/PreviewApp.tsx` — posts `READY` on mount; listens for `CONFIG_UPDATE`; calls `generatePreviewTokens`; writes CSS vars to a `<style>` tag; renders `<SystemPreviewLayout />`
- `preview-sandbox/src/generatePreviewTokens.ts` — maps `ProjectConfig` → `Record<string, string>` of CSS custom properties; covers color palette, typography font families and scale ratio, spacing scale (base unit derived from density), border radius (from personality), box-shadow (from dimensionality)
- `preview-sandbox/src/SystemPreviewLayout.tsx` — renders the preview content using CSS custom properties: a color swatch row for the primary scale (7 swatches from lightest to darkest), a type scale sample (4 sizes rendered at their sizes), a Button component strip (default, primary, ghost variants), a Card with a FormField inside

**`generatePreviewTokens` contract:**
Produces a flat `Record<string, string>`. Key CSS vars it must include:
- `--color-primary`: primary hex from config
- `--color-primary-light`: lightened version (for backgrounds)
- `--color-primary-dark`: darkened version (for hover states)
- `--color-surface`: background surface color (`#ffffff` for light mode)
- `--color-text`: primary text color (`#111827` for light mode)
- `--color-text-muted`: secondary text color
- `--font-display`: display font family string (e.g., `'Fraunces', Georgia, serif`)
- `--font-body`: body font family string
- `--font-scale-ratio`: type scale ratio as a unitless number
- `--spacing-base`: base spacing unit in px (3px compact / 4px balanced / 5px spacious)
- `--radius-sm`: small radius (0 flat / 4px subtle / 8px dimensional-like personality-driven)
- `--radius-md`: medium radius
- `--shadow-sm`: box-shadow value (none for flat / soft for subtle / pronounced for dimensional)

`generatePreviewTokens` is a simplified approximation — it does not call the server pipeline and does not need to produce values identical to `generate(config)`. Accuracy matters less than responsiveness.

**Font families by TypeStyle:**
| TypeStyle | display | body |
|---|---|---|
| geometric | `'Inter', sans-serif` | `'Inter', sans-serif` |
| humanist | `'Plus Jakarta Sans', sans-serif` | `'Inter', sans-serif` |
| serif-accented | `'Fraunces', Georgia, serif` | `'Inter', sans-serif` |
| monospace-accented | `'Inter', sans-serif` | `'JetBrains Mono', monospace` |

**Acceptance criteria:**
- [ ] `cd preview-sandbox && npm run dev` starts a Vite dev server on port 5174 without errors
- [ ] `cd preview-sandbox && npm run build` produces a `dist/` directory
- [ ] Navigating to `http://localhost:5174` in a browser shows the `SystemPreviewLayout` with a colored swatch row, type samples, and a Button strip
- [ ] Opening the browser console and running `window.postMessage({ type: 'CONFIG_UPDATE', config: {...} }, '*')` with a modified primaryHex causes the swatch color to update
- [ ] `READY` message is posted to `window.parent` on mount (verifiable via parent window `message` listener)
- [ ] `tsc --noEmit` in `preview-sandbox/` passes
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- Must not make network requests to the backend API — all preview logic is client-side
- Must not use Zustand, React Router, or other frontend app dependencies — the sandbox is intentionally minimal
- Must not implement full WCAG contrast calculation — that is in Stage 1 (Task 2.5)

---

### Task 2.3 — `SystemPreview` component

> **Status:** `[ ]` Not started
> **Session:** —
> **Depends on:** Task 2.2

**What this task implements:**
A `SystemPreview` React component in the main frontend that wraps the preview sandbox in an iframe. It reads `configStore` and bridges config changes to the sandbox via postMessage with a 50ms debounce. It shows a loading skeleton until the `READY` message is received. It shows a static fallback if the iframe fails to load.

**Files to create or modify:**
- `frontend/src/components/preview/SystemPreview.tsx` — the iframe wrapper component
- `frontend/src/components/preview/SystemPreviewSkeleton.tsx` — loading skeleton (grey shimmer blocks approximating the layout)
- `frontend/src/components/preview/SystemPreviewFallback.tsx` — static fallback (shown if `READY` is not received within 5s or iframe errors)
- `frontend/.env.example` — add `VITE_PREVIEW_URL=http://localhost:5174`
- `frontend/vite.config.ts` — no change needed; iframe loads independently

**`SystemPreview` component behavior:**
- Renders `<iframe src={previewUrl} />` where `previewUrl` is `import.meta.env.VITE_PREVIEW_URL ?? 'http://localhost:5174'`
- On mount: attaches a `window.message` listener; listens for `{ type: 'READY' }`; on receipt, sets `ready = true` and clears the skeleton
- If `READY` not received within 5 seconds: shows the fallback instead of skeleton
- Subscribes to `configStore` via `useEffect`; on any config change, debounces 50ms then calls `iframeRef.current.contentWindow.postMessage({ type: 'CONFIG_UPDATE', config }, '*')`
- On unmount: cleans up message listener and debounce timer

**Acceptance criteria:**
- [ ] `SystemPreview` renders an iframe and a skeleton simultaneously until `READY` is received, then hides the skeleton
- [ ] Changing any field in `configStore` (verified via `configStore.getState().setConfig(...)` in the browser console) causes a `CONFIG_UPDATE` postMessage to be sent to the iframe within 50ms
- [ ] If the iframe `src` is pointed at a non-existent URL, the fallback is shown after 5 seconds
- [ ] No console errors when the component mounts and unmounts
- [ ] `tsc --noEmit` in `frontend/` passes
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- Must not poll the iframe — only respond to `message` events
- Must not send a postMessage on every render — only on configStore changes
- Must not hardcode the preview URL — it reads from `VITE_PREVIEW_URL`

---

### Task 2.4 — Creation flow shell

> **Status:** `[ ]` Not started
> **Session:** —
> **Depends on:** Task 2.3

**What this task implements:**
The creation flow navigation shell: a stage progress indicator, Back/Continue buttons, stage management in `uiStore`, and `localStorage` persistence of `configStore` for anonymous users. Updates `NewProjectPage.tsx` to use the shell with default config. Updates `ProjectPage.tsx` to load project config from the API and populate `configStore` before mounting the shell.

**Files to create or modify:**
- `frontend/src/components/creation/CreationFlow.tsx` — shell component; renders `StageProgress`, the current stage component (switching on `uiStore.currentStage`), and `StageNav`; stages 0–3 render placeholder `<div>Stage N</div>` until Tasks 2.5–2.8 replace them
- `frontend/src/components/creation/StageProgress.tsx` — four numbered steps; current step highlighted; completed steps shown as done; clicking a completed step navigates back to it
- `frontend/src/components/creation/StageNav.tsx` — Back button (hidden on stage 0) + Continue button; Continue button is disabled when `uiStore.canContinue` is false; clicking Continue increments `uiStore.currentStage`
- `frontend/src/store/uiStore.ts` — add `canContinue: boolean`, `setCanContinue(v: boolean)`, `goToStage(n: number)`, `nextStage()`, `prevStage()` to existing store; `canContinue` defaults to `true` (stages 0 and 1 will override this)
- `frontend/src/store/configStore.ts` — add localStorage sync: on every `setConfig` call, write the updated config to `localStorage['ds-gen-config']`; add `loadFromLocalStorage(): boolean` action that reads and validates the stored config (returns true if found + valid)
- `frontend/src/components/NewProjectPage.tsx` — replace stub with: load from localStorage if present, otherwise set DEFAULT_CONFIG; mount `<CreationFlow />`
- `frontend/src/components/ProjectPage.tsx` — replace stub with: call `GET /projects/:id` on mount; on success, call `configStore.setConfig(project.config)` and `uiStore.goToStage(0)`; render `<CreationFlow />`; on 404 or 403, redirect to `/`

**Acceptance criteria:**
- [ ] Navigating to `/new` renders the shell with stage 1 of 4 highlighted in the progress indicator
- [ ] Clicking "Continue" advances to the next stage; stage indicator updates
- [ ] Clicking "Back" returns to the previous stage; stage indicator updates
- [ ] "Back" is not shown on stage 1
- [ ] Refreshing `/new` with a stored config in `localStorage['ds-gen-config']` preserves the config (stage resets to 1 — this is intentional for anonymous users)
- [ ] Navigating to `/projects/:id` for a valid owned project loads that project's config into `configStore`
- [ ] Navigating to `/projects/:id` for a non-existent or forbidden project redirects to `/`
- [ ] `tsc --noEmit` in `frontend/` passes
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- Must not implement any stage UI content in this task — stage components render `<div>Stage N placeholder</div>` until Tasks 2.5–2.8
- Must not auto-save to the API in this task — auto-save is Phase 3
- Must not implement the "Continue your work?" prompt for localStorage recovery — just silently apply the stored config

---

### Task 2.5 — Stage 1: Foundation

> **Status:** `[ ]` Not started
> **Session:** —
> **Depends on:** Task 2.4

**What this task implements:**
All four steps of Stage 1: project type selection with scope chips and Customize disclosure, brand assets toggle with hex inputs, color direction cards, and mode selection. All steps read from and write to `configStore`. The Continue button is disabled until a project type is selected and (if "I have brand assets" is selected) a valid 6-digit hex color is provided.

**Files to create or modify:**
- `frontend/src/components/creation/stages/Stage1Foundation.tsx` — top-level stage component; renders all 4 steps in sequence; calls `uiStore.setCanContinue()` based on validation state
- `frontend/src/components/creation/stages/stage1/ProjectTypeStep.tsx` — three selection cards (SaaS / Web App, Marketing Site, Mobile Web); on select, updates `configStore.projectType` and resets `componentScope` to the default for that type; renders scope chips row below; "Customize" toggle reveals a checklist of all 6 categories
- `frontend/src/components/creation/stages/stage1/BrandAssetsStep.tsx` — toggle between "Starting fresh" and "I have brand assets"; "I have brand assets" reveals: primary hex input (required), secondary hex (optional), typeface name text input (optional); hex inputs validate format on blur and show inline error for invalid values; valid primary hex is written to `configStore.color.primaryHex` and `configStore.color.source = 'provided'`; "Starting fresh" sets `configStore.color.source = 'generated'`
- `frontend/src/components/creation/stages/stage1/ColorDirectionStep.tsx` — five color swatch cards; visible only when `configStore.color.source === 'generated'`; each card shows a mini swatch strip with 5 color steps; on select, updates `configStore.color.colorDirection`; initial selection matches `DEFAULT_CONFIG.color.colorDirection`
- `frontend/src/components/creation/stages/stage1/ModeStep.tsx` — three-option selection (Light only, Dark only, Both); on select, updates `configStore.modes`; initial selection is Light only

**Scope defaults by project type** (must match spec):
| Category | saas | marketing | mobile |
|---|---|---|---|
| forms | ✓ | ✓ | ✓ |
| navigation | ✓ | ✓ | ✓ |
| overlays | ✓ | — | — |
| feedback | ✓ | ✓ | ✓ |
| data-display | ✓ | — | — |
| layout | ✓ | ✓ | ✓ |

**Color direction → primaryHex mapping** (used when source = 'generated' and no brand color provided):
| colorDirection | primaryHex |
|---|---|
| cool-professional | `#3b82f6` |
| warm-approachable | `#f59e0b` |
| bold-high-contrast | `#dc2626` |
| neutral-minimal | `#6b7280` |
| earth-tones | `#92400e` |

Selecting a color direction card updates both `configStore.color.colorDirection` and `configStore.color.primaryHex` to this mapping.

**WCAG warning for brand colors:**
When a brand primary hex is entered and is valid, check its contrast ratio against white (`#ffffff`) in the component using the formula: relative luminance comparison. If contrast < 4.5:1, show an inline warning with suggested fix text ("This color may be hard to read on white backgrounds"). Do not block the user — the warning is advisory.

**Acceptance criteria:**
- [ ] Clicking a project type card immediately updates the scope chips row to show the correct categories for that type
- [ ] Toggling individual categories in the Customize checklist updates the chip row and `configStore.componentScope`
- [ ] The Customize checklist prevents de-selecting all categories (at least 1 must remain checked)
- [ ] Switching to "I have brand assets" shows the hex input; entering a valid 6-hex updates the preview within 500ms (via postMessage bridge from configStore change)
- [ ] Entering a color with contrast ratio < 4.5:1 against white shows a WCAG warning message
- [ ] Switching back to "Starting fresh" hides the hex inputs and shows the color direction cards
- [ ] Selecting a color direction card updates the preview within 500ms
- [ ] The Continue button is disabled when "I have brand assets" is selected and the hex input is empty or invalid
- [ ] The Continue button is enabled as soon as a project type is selected and color input is valid (or "Starting fresh")
- [ ] `tsc --noEmit` in `frontend/` passes
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- Must not implement the typeface name Google Fonts loading — that is deferred to Phase 3
- Must not implement the "accept suggested alternative" WCAG fix flow — just show the warning
- Must not validate WCAG for secondary/accent colors — only primary

---

### Task 2.6 — Stage 2: Style

> **Status:** `[ ]` Not started
> **Session:** —
> **Depends on:** Task 2.4

**What this task implements:**
Stage 2: four personality axis sections. Each section shows a row of visual selection cards. The selected card has a distinct visual state. Each section has a "Customize" disclosure that expands to show fine-grained controls (simplified for this phase). Selecting any card immediately updates `configStore.shape` and the live preview.

**Files to create or modify:**
- `frontend/src/components/creation/stages/Stage2Style.tsx` — top-level stage component; renders 4 axis sections; sets `uiStore.canContinue(true)` on mount (all axes have defaults, Continue is always enabled)
- `frontend/src/components/creation/stages/stage2/AxisSection.tsx` — reusable component: takes axis name, description, options array, current value, onChange handler; renders option cards + "Customize" disclosure toggle
- `frontend/src/components/creation/stages/stage2/DensityAxis.tsx` — wraps AxisSection for density (compact / balanced / spacious); each card shows a mini spacing scale visual
- `frontend/src/components/creation/stages/stage2/PersonalityAxis.tsx` — wraps AxisSection for personality (professional / approachable / bold / minimal); each card shows a mini button + color swatch visual
- `frontend/src/components/creation/stages/stage2/TypeStyleAxis.tsx` — wraps AxisSection for typeStyle (geometric / humanist / serif-accented / monospace-accented); each card renders a sample text line in the actual typeface (loaded via Google Fonts `<link>` on mount)
- `frontend/src/components/creation/stages/stage2/DimensionalityAxis.tsx` — wraps AxisSection for dimensionality (flat / subtle / dimensional); each card shows a mini card silhouette with appropriate shadow treatment

**Customize disclosure contents (simplified — full controls are Phase 3):**
- Density: numeric input for base spacing unit (1–8px); on change, write to a non-schema field or show as informational only (not stored in `ProjectConfig` — density maps to base unit at pipeline time)
- Personality, TypeStyle, Dimensionality: show a text note "Deep customization coming in a future release." The disclosure opens and closes but has no functional inputs.

**Acceptance criteria:**
- [ ] All four axis sections render with the current config values pre-selected
- [ ] Selecting a different Density card updates `configStore.shape.density`; preview updates within 500ms
- [ ] Selecting a different Personality card updates `configStore.shape.personality`; preview updates within 500ms
- [ ] Selecting a different TypeStyle card updates `configStore.typography.typeStyle` and the font family vars; preview updates within 500ms
- [ ] Selecting a different Dimensionality card updates `configStore.shape.dimensionality`; preview updates within 500ms
- [ ] Each TypeStyle card renders sample text in the correct typeface (Google Fonts loaded)
- [ ] Clicking "Customize" on any axis expands the disclosure; clicking again collapses it
- [ ] Continue button is always enabled on Stage 2
- [ ] `tsc --noEmit` in `frontend/` passes
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- Must not implement fine-grained custom color palette editing in the Personality disclosure — stub it out with a "coming soon" note
- Must not implement custom typeface upload — stub the disclosure

---

### Task 2.7 — Stage 3: Review

> **Status:** `[ ]` Not started
> **Session:** —
> **Depends on:** Task 2.4, Task 2.3

**What this task implements:**
Stage 3: the full System Preview in the primary content area, a collapsible token summary section, and the project name input. The Continue button is disabled until a non-empty project name is entered. For logged-in users viewing an existing project, the project name input pre-fills from the project record.

**Files to create or modify:**
- `frontend/src/components/creation/stages/Stage3Review.tsx` — top-level stage component; renders `<SystemPreview />` at full width, then `<TokenSummary />`, then `<ProjectNameInput />`; calls `uiStore.setCanContinue(false)` on mount; re-enables Continue when project name is non-empty
- `frontend/src/components/creation/stages/stage3/TokenSummary.tsx` — collapsible sections: Primitives (color scale swatches), Semantic tokens (named semantic color assignments), Shape tokens (spacing/radius/shadow values); each section has a toggle; values displayed as colored swatches or formatted text; no network calls — derives display values from `configStore` using the same mapping as `generatePreviewTokens`
- `frontend/src/components/creation/stages/stage3/ProjectNameInput.tsx` — controlled text input; default value "My Design System"; writes to `configStore` via a new `projectName` field (see note below) or to `uiStore`; on change, calls `uiStore.setCanContinue(name.trim().length > 0)`

**Project name storage:**
`ProjectConfig` does not include a project name field (it is a pure design spec). The project name is stored separately — either in `uiStore.projectName: string` (for the creation flow) or in the project record from the API. For Phase 2, store it in `uiStore` only. It is posted to `POST /projects` in Phase 3.

**Token summary display values:**
The token summary does not call the backend. It derives display-only values from `configStore` using the same lightweight mappings as `generatePreviewTokens`:
- Colors: show the primary hex and 3 derived swatches
- Typography: show font family name and scale ratio
- Spacing: show 4 spacing steps derived from base unit
- Radii: show sm/md/lg values

**Acceptance criteria:**
- [ ] Stage 3 renders `<SystemPreview />` at the top; the preview is live and continues to reflect the config
- [ ] Token summary sections are collapsed by default; clicking each header expands/collapses them
- [ ] The Primitives section shows at least 5 color swatches labeled with semantic names
- [ ] The project name input defaults to "My Design System"
- [ ] The Continue button is disabled when the project name input is empty
- [ ] The Continue button is enabled as soon as a non-empty project name is entered
- [ ] `tsc --noEmit` in `frontend/` passes
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- Must not call the backend to compute token values — all display values derived client-side
- Must not implement "View raw JSON" toggle in this phase — stub the button as disabled with a tooltip "Coming soon"
- Must not implement "Back to adjust" deep links within Stage 3 — those are a polish item for Phase 3

---

### Task 2.8 — Stage 4: Export

> **Status:** `[ ]` Not started
> **Session:** —
> **Depends on:** Task 2.4, Task 2.1

**What this task implements:**
Stage 4: three export CTAs (Download ZIP, CLI command, Figma setup), plus the account prompt for anonymous users. The Download ZIP button calls the new `POST /api/v1/export` endpoint (Task 2.1) with the current `configStore` state and triggers a file download. The CLI command section is shown for logged-in users with a saved project. The account prompt is shown for anonymous users.

**Files to create or modify:**
- `frontend/src/components/creation/stages/Stage4Export.tsx` — top-level stage component; reads `userStore.user` to determine auth state; renders three CTA sections; Continue button is replaced by a "Done" button that navigates to `/`
- `frontend/src/components/creation/stages/stage4/DownloadZipCta.tsx` — prominent button; on click, calls `POST /api/v1/export` with `configStore.getState()` as body; on response, creates an object URL from the blob and triggers `<a download>` click; shows loading state during request; shows error message on failure
- `frontend/src/components/creation/stages/stage4/CliCommandCta.tsx` — if user is authenticated and `projectId` is set in context: shows the CLI command `npx @ds-gen/cli init --project={id}` in a code block with a copy-to-clipboard button; if anonymous: shows the command grayed out with the note "Save your project to get a project ID for the CLI"
- `frontend/src/components/creation/stages/stage4/FigmaSetupCta.tsx` — button that expands an inline guide: three numbered steps with links to the Base UI community file and Tokens Studio plugin; static content, no network calls
- `frontend/src/components/creation/stages/stage4/AccountPrompt.tsx` — shown only for anonymous users; "Create a free account to save this project and update it any time." with two buttons: "Save my project" (navigates to `/register`) and "Just download" (dismisses the prompt for the session)

**Download ZIP implementation:**
```typescript
const res = await fetch('/api/v1/export', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(configStore.getState()),
})
const blob = await res.blob()
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = `${uiStore.projectName ?? 'design-system'}.zip`
a.click()
URL.revokeObjectURL(url)
```

**Acceptance criteria:**
- [ ] Clicking "Download package" posts the current config to `POST /api/v1/export` and downloads a `.zip` file
- [ ] The ZIP filename uses `uiStore.projectName` (e.g., `my-design-system.zip`)
- [ ] A loading spinner is shown on the Download button during the request
- [ ] If the export request fails, an inline error message is shown
- [ ] For anonymous users, the account prompt is visible below the CTAs
- [ ] Clicking "Just download" dismisses the account prompt (hidden for the remainder of the session)
- [ ] "Save my project" navigates to `/register`
- [ ] Clicking the CLI copy button copies the command to clipboard
- [ ] `tsc --noEmit` in `frontend/` passes
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- Must not implement the full account creation flow at Stage 4 — "Save my project" just navigates to `/register`
- Must not implement project auto-save in this task — that is Phase 3
- Must not make the CLI command available for anonymous users without a project ID

---

### Task 2.9 — Playwright Phase 2 tests

> **Status:** `[ ]` Not started
> **Session:** —
> **Depends on:** Tasks 2.5 – 2.8 (all stages complete)

**What this task implements:**
Playwright e2e tests for the creation flow, covering the journey steps listed for Phase 2 in `docs/user-journeys.md`.

**Files to create or modify:**
- `frontend/tests/e2e/phase-2.spec.ts` — 5 tests (see below)
- `frontend/playwright.config.ts` — add preview-sandbox webServer entry: `{ command: 'npm run dev', cwd: resolve(__dirname, '../preview-sandbox'), url: 'http://localhost:5174', timeout: 30_000, reuseExistingServer: !process.env.CI }`

**Test cases:**
1. **Default state: preview renders on load** (journey 1.1.1–1.1.2): Navigate to `/new`. Assert `SystemPreview` iframe is visible. Assert stage progress shows step 1 active. Assert default project type "SaaS / Web App" card is visually selected.
2. **Project type change updates scope chips** (journey 1.2.1): Navigate to `/new`. Click "Marketing Site" card. Assert scope chips row no longer shows "Overlays" or "Data Display" chips.
3. **Color direction change updates preview** (journey 1.2.6): Navigate to `/new`. Click the "Warm & Approachable" color direction card. Assert the card is selected. Assert `configStore.color.colorDirection` is `'warm-approachable'` (read via `page.evaluate(() => window.__configStore?.color?.colorDirection)`).
4. **Complete flow → download ZIP** (journey 1.5.2–1.5.3): Navigate to `/new`. Click Continue through stages 1 and 2 (defaults are valid). On stage 3, type a project name. Click Continue to reach stage 4. Set up download interception. Click "Download package". Assert the download occurred and filename ends in `.zip`. Assert the downloaded file is a non-empty binary (content-length > 0).
5. **Unauthenticated: account prompt shown on Stage 4** (journey 1.5.1): Navigate to `/new`. Click Continue through all stages to Stage 4. Assert the account prompt ("Create a free account") is visible. Click "Just download". Assert the account prompt is no longer visible.

**Notes on ZIP download testing in Playwright:**
Use `page.waitForEvent('download')` to intercept the download triggered by the anchor click. Assert `download.suggestedFilename()` ends in `.zip`. Save to a temp path and assert file size > 0.

**Notes on configStore inspection:**
Expose the store for testing via a window global in development mode only:
```typescript
// frontend/src/main.tsx — add in dev mode only
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__configStore = useConfigStore.getState()
}
```

**Acceptance criteria:**
- [ ] `cd frontend && npx playwright test phase-2` — all 5 tests pass
- [ ] Tests run against real servers (backend + preview sandbox + frontend)
- [ ] Journey steps 1.1.1–1.1.2, 1.2.1, 1.2.6, 1.5.1–1.5.3 are covered (matches coverage table in `docs/user-journeys.md`)
- [ ] All Phase 1 Playwright tests still pass — 0 regressions
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- Must not mock the backend API — tests run against the real `POST /api/v1/export` endpoint
- Must not mock postMessage — the iframe actually loads and the preview sandbox runs

---

## Phase 2 completion checklist

Before starting Phase 3, verify all of the following:

- [ ] All tasks above marked `[x]` complete
- [ ] `cd backend && npm test` — all tests pass (includes new anonymous export tests)
- [ ] `cd frontend && npx playwright test` — all Phase 1 and Phase 2 e2e tests pass (8 total)
- [ ] `tsc --noEmit` in `packages/types`, `backend`, `frontend`, `preview-sandbox` — all pass with zero errors
- [ ] `eslint src` in `backend` and `frontend` — zero errors
- [ ] `cd preview-sandbox && npm run build` — builds without errors
- [ ] Navigating to `/new` in a browser, clicking through all 4 stages, and clicking "Download package" on Stage 4 produces a valid ZIP file
- [ ] The System Preview in the browser updates visibly within 500ms when a Stage 1 or Stage 2 selection is changed
- [ ] Phase retrospective written to `docs/phase-2-retro.md`
- [ ] `docs/user-journeys.md` updated for Phase 3 scope
- [ ] `docs/design-system-plan-summary.md` updated to mark Phase 2 Complete
- [ ] Session log archived to `logs/phase-2.md`

---

## Completed task log

*(Tasks are compressed to this format once complete. Full details live in the session log.)*

<!--
### Task 2.X — [Task name] ✓
**Output:** [One sentence: what was built.]
**Key decisions:** [Any non-obvious choices made.]
**Session:** [Date / SESSION_LOG pointer]
-->
