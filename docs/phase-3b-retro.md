# Phase 3b Retrospective — Color System Expansion and UX Foundations

**Date:** 2026-05-04
**Phase duration:** 1 session (all 6 tasks completed in a single day)

---

## What went well

**Functional color aliasing was correct on the first attempt.** The `deriveFunctionalColors()` algorithm — aliasing `info → primary` when hue distance ≤ 30° of 220°, `warning → accent` when hue distance ≤ 30° of 35° — handled the default config (blue primary) correctly without generating a duplicate scale. 276 backend tests confirmed no regressions.

**The pipeline/UI split was clean.** Task 3b.1 (pipeline) and Task 3b.3 (preview) could be developed independently; Task 3b.2 (UI) only needed the types package, not the backend runtime. This meant tasks could proceed in parallel within the session.

**`setColor(partial)` store action kept UI code simple.** Rather than each UI component writing directly to `config.color`, a single shallow-merge action with auto-persist meant all three Stage 1 components (`Stage1PaletteSelector`, `Stage1BrandColors`, `Stage1FunctionalColors`) stayed focused on rendering logic.

**Unified dev startup was two lines.** Installing `concurrently` and adding a root `"dev"` script was the entire task. The existing workspace structure did the rest.

---

## What was harder than expected

**13 Playwright test failures after the landing page routing change.** Failures came from four independent causes simultaneously: (1) stale servers on port 5299 with wrong env vars from a prior dev run; (2) routing change from `/` to `/projects` for post-login redirects; (3) "Warm & Approachable" palette preset removed, invalidating test 1.3 button selector; (4) `.inline-flex.rounded-full` chip selector matched both scope chips and functional color chips, breaking the count assertion. Each required a separate fix, and the stale server issue masked all the others until servers were killed.

**Dev DB migration gap.** `ds_gen_dev` had been created but never migrated — it contained no tables. Playwright tests always run against `ds_gen_test` (migrated in playwright.config.ts webServer setup), so all 21 tests passed. But clicking "Download package" in the running dev app returned a 500 error because the dev backend hit a table-not-found error. Running `npm run migrate:up` against `ds_gen_dev` fixed it. This is a one-time setup issue but easy to miss when only running tests.

**Chip selector disambiguation.** `Stage1FunctionalColors` renders `inline-flex rounded-full` chips with `bg-gray-50`, and `Stage1ComponentScope` renders them with `bg-blue-50`. The generic selector `.inline-flex.rounded-full` matched both, inflating the count in test 1.2. Reading the source files to identify the distinguishing class was necessary before the fix was obvious.

---

## Key decisions

| Decision | Rationale |
|---|---|
| Functional colors enabled by project type, not opt-in | Consistent with the product model: saas/mobile apps always need error/warning/success/info states. `functionalColors.enabled` is an override for edge cases, not the primary mechanism. |
| `info → primary` alias for blue-hue primaries | Avoids generating two nearly-identical blue scales. The alias is only applied when hue distance is ≤ 30°, so non-blue primaries get a distinct info scale. |
| `<input type="color">` hidden behind a styled `<label>` | Native color picker avoids OS-inconsistent chrome; wrapping in a label with a styled colored span gives a consistent swatch appearance while preserving accessibility. |
| `clearPresetIfNeeded` pattern in `Stage1BrandColors` | Only clears `paletteId` when source is already `'preset'`. Prevents redundant store writes for users already in custom mode and avoids a render cycle on every hex field keystroke. |
| `toBeAttached()` for conditional "off" span | The `<span>off</span>` inside inactive functional chips is conditionally rendered (not CSS-hidden). `not.toBeVisible()` would pass even when the span exists but is scrolled out of view. `toBeAttached()` tests the DOM structure, which is what actually matters here. |
| `readFlowColor()` reads from localStorage directly | The configStore writes a flat `ProjectConfig` JSON string under `'ds-gen-flow-config'` (not wrapped in a Zustand state envelope). Reading via `page.evaluate(() => localStorage.getItem(...))` is straightforward and doesn't require exposing the store on `window`. |
| Port 5173 for root `npm run dev`, port 5299 for Playwright | The Playwright `webServer` passes `--port 5299` explicitly; the root dev script doesn't need to match it. Decoupling them means `npm run dev` runs the real dev server on Vite's default port without conflicting with test runs. |

---

## Carry forward to Phase 4

- **Phase 4 depends on Phase 3b being complete** — the task file dependency note says "Phase 3 complete" but should read "Phase 3b complete"; updated.
- **`colorDirection` is still in the type schema** — kept for backward compatibility with existing DB records. Phase 4+ removes it once a migration is written. Not technical debt — the decision is documented in `tasks/phase-3b.md`.
- **Dev DB migration reminder** — when onboarding a new dev environment, running `npm run migrate:up` against both `ds_gen_dev` and `ds_gen_test` is required. The Playwright config handles `ds_gen_test` automatically via its `webServer` setup; `ds_gen_dev` requires a manual step. Consider documenting this in `DEVELOPMENT.md` in a future phase.
