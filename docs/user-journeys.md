# User Journeys — Design System Generator

**Purpose:** Canonical user flows that the product must support end-to-end. These journeys serve two purposes:

1. **Gap detection** — before starting a task, check whether any journey step that should now be possible isn't. Don't move to the next phase until every step that the phase is supposed to unlock actually works.
2. **Test coverage target** — each Playwright test file should cite the journey steps it covers. The coverage table at the bottom tracks which steps are exercised by automated tests.

---

## Maintaining this document

This document must be reviewed and updated at every phase boundary. At the end of each phase, before starting the next one:

1. Read the next phase's task file in full.
2. For each task: does it unlock user-facing behavior not yet described in a journey step? If yes, add or extend the relevant journey.
3. Do any currently-deferred steps become testable in the next phase? If yes, remove the `(deferred)` note.
4. Do any existing steps describe behavior that has changed? If yes, revise the step.
5. Update the coverage table — new steps start in "not yet covered."

A good step describes one observable action and its expected outcome from the user's perspective. It is not an internal state change (a store update, an API call). It is not two decisions bundled together.

---

## Journey 1 — Create a Design System from Scratch (Anonymous)

The core product flow for a new user with no account and no existing brand assets. This is the minimum viable experience — a user who cannot complete this journey cannot use the product.

### 1.1 — Arrival and first impression

| Step | Action | Expected result |
|---|---|---|
| 1.1.1 | Navigate to the app for the first time | Creation flow loads with Stage 1 visible; System Preview shows a default design system immediately |
| 1.1.2 | Observe the default state | SaaS / Web App is pre-selected; scope chips show 6 categories; System Preview shows components styled with a blue primary and cool gray neutrals |

### 1.2 — Stage 1: Foundation

| Step | Action | Expected result |
|---|---|---|
| 1.2.1 | Click the "Marketing Site" project type card | Card becomes selected; scope chips update to reflect Marketing Site defaults (Overlays and Data Display chips disappear) |
| 1.2.2 | Click the "SaaS / Web App" card again | Scope chips revert to SaaS defaults |
| 1.2.3 | Click "Customize" below the scope chips | Checklist expands showing all 6 category toggles |
| 1.2.4 | Uncheck "Overlays" | Overlays chip disappears from the summary row |
| 1.2.5 | Re-check "Overlays" | Overlays chip reappears |
| 1.2.6 | Select "Starting fresh" (default) and choose "Warm & Approachable" color direction | System Preview primary color shifts to an amber/orange hue |
| 1.2.7 | Select "Both" for light/dark mode | System Preview shows a mode toggle in its header |
| 1.2.8 | Click "Continue" | Stage 2 becomes active |

### 1.3 — Stage 2: Style

| Step | Action | Expected result |
|---|---|---|
| 1.3.1 | Observe Stage 2 | Four axis rows visible: Density, Personality, Type Style, Dimensionality; defaults are pre-selected |
| 1.3.2 | Select "Compact" density | System Preview components visibly tighten in spacing |
| 1.3.3 | Select "Bold" personality | System Preview primary color becomes more saturated; button interactive states become more prominent |
| 1.3.4 | Select "Serif-accented" type style | System Preview headings render in the Fraunces serif typeface |
| 1.3.5 | Select "Flat" dimensionality | System Preview card and component shadows disappear; borders become more prominent |
| 1.3.6 | Click "Customize" on the Density axis | Fine-grained spacing controls expand below the axis cards |
| 1.3.7 | Click "Continue" | Stage 3 becomes active |

### 1.4 — Stage 3: Review

| Step | Action | Expected result |
|---|---|---|
| 1.4.1 | Observe Stage 3 | Full System Preview is prominent; color palette swatches, type scale, and component strip are all visible |
| 1.4.2 | Toggle dark mode in the System Preview header | System Preview switches to dark mode; all colors update correctly |
| 1.4.3 | Observe accessibility badges | Every semantic color pairing shows a WCAG AA or AAA badge; no failing badges present |
| 1.4.4 | Click "View raw JSON" in the token summary | W3C DTCG JSON is revealed for the primitives layer |
| 1.4.5 | Enter a project name in the name field | Name input updates; default "My Design System" is replaced |
| 1.4.6 | Click "Continue" | Stage 4 becomes active |

### 1.5 — Stage 4: Export (anonymous)

| Step | Action | Expected result |
|---|---|---|
| 1.5.1 | Observe Stage 4 | Three CTAs visible: Download package, CLI command (grayed out with note), Figma setup; account prompt shown below |
| 1.5.2 | Click "Download package" | ZIP file downloads immediately; no account required |
| 1.5.3 | Inspect the ZIP contents | Contains `tokens/`, `components/`, `docs/` directories with all expected files |
| 1.5.4 | Click "Just download" in account prompt | Prompt dismisses; no account created; user remains on Stage 4 |

---

## Journey 2 — Create a Design System with Existing Brand Assets

A user who arrives with a primary brand color and a typeface name.

### 2.1 — Providing brand assets

| Step | Action | Expected result |
|---|---|---|
| 2.1.1 | On Stage 1, select "I have brand assets" | Input area expands: primary color hex input, secondary color (optional), typeface name (optional) |
| 2.1.2 | Enter a primary color hex value (`#e63946`) | System Preview updates immediately with the provided red as the primary hue |
| 2.1.3 | Observe accessibility indicator | If the color fails WCAG AA on white, a warning badge appears with a suggested alternative; the original color is still shown |
| 2.1.4 | Enter a Google Fonts typeface name ("DM Sans") | System Preview updates to render DM Sans in all text elements |
| 2.1.5 | Complete Stages 2–4 as normal | System uses the provided color anchored into its scale; typeface used throughout |

---

## Journey 3 — Save a Project and Return to It

A user who creates an account, saves their project, and returns later to re-export.

### 3.1 — Account creation at export

| Step | Action | Expected result |
|---|---|---|
| 3.1.1 | Reach Stage 4 with a completed flow | Account prompt shown |
| 3.1.2 | Click "Save my project" | Account creation modal opens: email, password, display name |
| 3.1.3 | Complete account creation | Email verification sent; user sees "Check your email" message |
| 3.1.4 | Verify email via link | Account verified; redirected back to Stage 4 of their in-progress project |
| 3.1.5 | Project is now saved | Project appears in the user's home page project list |

### 3.2 — Returning to a saved project

| Step | Action | Expected result |
|---|---|---|
| 3.2.1 | Log in and navigate to home page | Project grid shows the saved project with name, type chip, and palette thumbnail |
| 3.2.2 | Click the project card | Creation flow loads with all previous choices intact across all stages |
| 3.2.3 | Change the primary color in Stage 1 | System Preview updates immediately |
| 3.2.4 | Navigate to Stage 4 | "Saved" indicator shown in header; project auto-saved in background |
| 3.2.5 | Click "Download package" | New ZIP downloaded reflecting updated choices |

### 3.3 — Home page project management

| Step | Action | Expected result |
|---|---|---|
| 3.3.1 | Click "New project" | Creation flow starts with default config |
| 3.3.2 | Open overflow menu on a project card | Options: Rename, Duplicate, Delete |
| 3.3.3 | Click "Rename" | Inline edit field opens on the project name |
| 3.3.4 | Click "Duplicate" | New project created with identical config; appears in project grid |
| 3.3.5 | Click "Delete" | Confirmation dialog; on confirm, project removed from grid |

---

## Journey 4 — Integrate the Design System into a Codebase

A developer who has exported a design system and wants to bring it into their React project.

### 4.1 — ZIP-based integration

| Step | Action | Expected result |
|---|---|---|
| 4.1.1 | Download ZIP from Stage 4 | ZIP file downloaded |
| 4.1.2 | Extract ZIP and inspect `tokens/variables.css` | CSS file with `:root { }` block containing all custom properties |
| 4.1.3 | Import `variables.css` in project root | Custom properties available throughout the app |
| 4.1.4 | Copy `components/` into project | Components importable; TypeScript compiles without errors |
| 4.1.5 | Import and render `<Button>` | Button renders with correct visual style from token values |

### 4.2 — CLI-based integration

| Step | Action | Expected result |
|---|---|---|
| 4.2.1 | Navigate to account settings → CLI section | Auth token shown (hidden by default); copy button; `init` and `sync` command instructions |
| 4.2.2 | Copy the CLI auth token | Token copied to clipboard |
| 4.2.3 | Run `npx @ds-gen/cli init --project={id}` | CLI prompts for auth token on first run; files written to `./design-system/` |
| 4.2.4 | Run `npx @ds-gen/cli sync` from the project directory | CLI reads `.design-system-meta.json`, fetches latest manifest, overwrites files |

### 4.3 — Figma integration

| Step | Action | Expected result |
|---|---|---|
| 4.3.1 | Click "Figma setup guide" on Stage 4 | Step-by-step illustrated guide opens |
| 4.3.2 | Follow guide: duplicate Base UI community file | Figma file duplicated to user's workspace |
| 4.3.3 | Follow guide: install Tokens Studio plugin | Plugin installed |
| 4.3.4 | Follow guide: import `semantic.json` via Tokens Studio | All semantic color tokens applied as Figma variables; components update to reflect design system colors |

---

## Journey 5 — Coding Agent Reads the Design System

A coding agent (e.g. Claude Code) uses the agent API to understand a design system before writing code.

### 5.1 — Agent reads the spec

| Step | Action | Expected result |
|---|---|---|
| 5.1.1 | Agent is given the agent API URL | URL is `https://app.com/api/v1/systems/{projectId}/spec` |
| 5.1.2 | Agent fetches the URL | JSON response with `tokens`, `components`, `rules` sections |
| 5.1.3 | Agent reads `rules.tokenUsage` | "Always reference semantic tokens, never primitive tokens, in component code" |
| 5.1.4 | Agent reads the `Button` component spec | Variants, sizes, token refs, accessibility notes, usage guidance all present |
| 5.1.5 | Agent writes a compliant component | Component uses CSS custom property references matching the system's token names |

---

## Test Coverage Table

Update this table when adding or modifying Playwright tests.

| Journey step | Test file | Test name | Phase |
|---|---|---|---|
| 3.1.1–3.1.4 | `e2e/phase-1.spec.ts` | register → verify email → login → home page | 1 |
| 3.2.1 | `e2e/phase-1.spec.ts` | log in → home page shows project list (empty state) | 1 |
| 1.1.1–1.1.2 | `e2e/phase-2.spec.ts` | default state: preview renders on load | 2 |
| 1.2.1 | `e2e/phase-2.spec.ts` | project type change updates scope chips | 2 |
| 1.2.6 | `e2e/phase-2.spec.ts` | color direction change updates preview | 2 |
| 1.3.2–1.3.5 | `e2e/phase-2.spec.ts` | personality axis changes update preview within 500ms | 2 |
| 1.5.2–1.5.3 | `e2e/phase-2.spec.ts` | download ZIP → valid contents | 2 |
| 3.1.5 | `e2e/phase-3.spec.ts` | create account at export → project saved | 3 |
| 3.2.2–3.2.5 | `e2e/phase-3.spec.ts` | return to saved project → config intact → re-export | 3 |
| 3.3.4 | `e2e/phase-3.spec.ts` | duplicate project → appears in grid | 3 |
| 3.3.5 | `e2e/phase-3.spec.ts` | delete project → removed from grid | 3 |
| 4.2.3–4.2.4 | `e2e/phase-4.spec.ts` | CLI init → files written; CLI sync → files updated | 4 |
| 5.1.1–5.1.4 | `e2e/phase-4.spec.ts` | agent API: GET spec → valid JSON with all required fields | 4 |

### Steps not yet covered by automated tests

**Journey 1 (Phase 2):**
- 1.2.3–1.2.5 — Customize scope disclosure expand/collapse
- 1.2.7 — Light/dark mode toggle in Stage 1
- 1.3.6 — Customize disclosure on density axis
- 1.4.1–1.4.5 — Stage 3 full review interactions
- 1.5.4 — Account prompt dismiss without account creation

**Journey 2:**
- 2.1.1–2.1.5 — Brand asset input flow _(not yet covered)_

**Journey 4:**
- 4.1.1–4.1.5 — ZIP-based integration _(manual verification; no Playwright test)_
- 4.3.1–4.3.4 — Figma integration guide _(manual verification; external tool)_

**Journey 5:**
- 5.1.5 — Agent writes compliant component _(requires agent execution; out of scope for automated tests)_

---

## Process rule

At the start of each task that touches the frontend or any user-facing API:

1. Identify which journey steps this task enables.
2. Add them to the task's acceptance criteria.
3. If the task includes Playwright work, cite the journey steps in the test file header comment.
4. When marking a task complete, update the coverage table above.
