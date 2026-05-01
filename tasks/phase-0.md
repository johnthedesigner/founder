# Phase 0 — Pipeline Foundation

> **Status:** Not started
> **Depends on:** Nothing. This is the first phase.
> **Reference:** `docs/design-system-dev-plan.md` § Phase 0 — Pipeline Foundation

---

## Overview

The generation pipeline is fully functional and tested before any API, database, or frontend is built. At the end of this phase, `generate(config: ProjectConfig)` produces correct, accessible, well-formed output for any valid `ProjectConfig`. This phase is entirely TypeScript unit tests driving pure functions. Nothing is deployed. The pipeline is the hardest and most important part of the product — it must be solid before anything is built around it.

---

## Tasks

### Task 0.1 — Types and defaults

> **Status:** `[ ]` Not started
> **Session:** —
> **Depends on:** None

**What this task implements:**
The shared type definitions for the entire project (`ProjectConfig` and all sub-types, `GeneratedSystem`, `GeneratedFile`, `TokenSet`) and the `DEFAULT_CONFIG` constant. No pipeline logic — only the type contracts and the baseline config that the rest of Phase 0 builds against.

**Files to create or modify:**
- `packages/types/src/config.ts` — Full `ProjectConfig` type and all constituent types (`ProjectType`, `ComponentCategory`, `ColorMode`, `Density`, `Personality`, `TypeStyle`, `Dimensionality`, `ColorSource`, `ColorDirection`, `ColorConfig`, `TypographyConfig`, `ShapeConfig`)
- `packages/types/src/output.ts` — `GeneratedSystem`, `GeneratedFile`, `TokenSet`, `ColorScale` types
- `packages/types/src/api.ts` — Request/response shapes for generation and project API routes
- `packages/types/src/index.ts` — Barrel export of all types
- `backend/src/pipeline/palette/defaults.ts` — `DEFAULT_CONFIG` constant and the `SAFE_DEFAULT_PRIMARIES` array (8 pre-validated seed colors)
- `backend/tests/pipeline/types.test.ts` — Tests for this task

**Acceptance criteria:**
- [ ] All types in `packages/types/src/config.ts` match the definitions in `docs/design-system-dev-plan.md` § The `ProjectConfig` Type exactly
- [ ] `DEFAULT_CONFIG` is a valid `ProjectConfig` — passes Zod schema validation (Zod schema defined in this task as `ProjectConfigSchema` in `packages/types/src/config.ts` and exported)
- [ ] `DEFAULT_CONFIG.color.primaryHex` is `#3b82f6`
- [ ] `SAFE_DEFAULT_PRIMARIES` is an array of exactly 8 hex strings, each of which passes WCAG AA contrast (4.5:1) against both `#ffffff` and `#111111` — validated by a test that imports `contrastRatio` once it exists, but for now asserts the array has 8 members and all are valid hex strings
- [ ] `packages/types` builds with `tsc --noEmit` and emits declarations to `dist/` with zero errors
- [ ] `backend` can import from `@ds-gen/types` without TypeScript errors
- [ ] Tests pass: `cd backend && npm test -- --testPathPattern=types`
- [ ] `SESSION_LOG.md` updated with session entry and new Current State block

**Must not do:**
- Must not implement any pipeline logic — no color generation, no token mapping, no code generation
- Must not install any dependencies not already in `package.json` (types only task — no new runtime deps needed)

---

### Task 0.2 — Color scale generation

> **Status:** `[ ]` Not started
> **Session:** —
> **Depends on:** Task 0.1

**What this task implements:**
The `generateColorScale` function in `backend/src/pipeline/palette/generator.ts`. Given a seed hex color, produces a 19-step scale (50–950 in increments of 50) where each shade is selected by contrast ratio against the pre-defined `TARGET_CONTRASTS` table, producing cross-hue contrast consistency across all generated scales.

**Note for implementation:** The developer will provide an existing reference script implementing this algorithm. Review it before writing any code. You may integrate it directly (adapting it to the required interface) or rewrite it cleanly — the output contract is what matters, not the implementation. The reference script uses `chroma-js`.

**Files to create or modify:**
- `backend/src/pipeline/palette/generator.ts` — `generateColorScale(seedHex: string): ColorScale` and `TARGET_CONTRASTS: Record<number, number>`
- `backend/tests/pipeline/palette/generator.test.ts` — Tests for this task

**Acceptance criteria:**
- [ ] `generateColorScale` accepts a hex string and returns a `ColorScale` object with exactly 19 keys: `50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950`
- [ ] All returned values are valid 6-digit hex strings (match `/^#[0-9a-f]{6}$/i`)
- [ ] `TARGET_CONTRASTS` is exported and contains an entry for each of the 19 shade indices
- [ ] Shade 50 has a contrast ratio against `#ffffff` of less than 1.5 for any chromatic input (near-white)
- [ ] Shade 950 has a contrast ratio against `#000000` of less than 1.5 for any chromatic input (near-black)
- [ ] **Cross-hue consistency test:** For shades 100, 300, 500, 700, 900 — the contrast ratio of that shade against white (100/300) or black (700/900) is within ±0.3 of `TARGET_CONTRASTS[shade]` when tested against at least four distinct hues: `#3b82f6` (blue), `#e63946` (red), `#16a34a` (green), `#d97706` (amber)
- [ ] A gray seed (`#808080`) produces a valid 19-step grayscale with no errors thrown
- [ ] The function is pure: calling it twice with the same input returns identical output
- [ ] Tests pass: `cd backend && npm test -- --testPathPattern=generator`
- [ ] `tsc --noEmit` passes in `backend`
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- Must not generate the full primitive token set — that is Task 0.4
- Must not implement WCAG validation utilities — those are in Task 0.3
- Must not use OKLCH interpolation — the algorithm operates on brightness adjustments via `chroma-js`

---

### Task 0.3 — WCAG contrast validation

> **Status:** `[ ]` Not started
> **Session:** —
> **Depends on:** Task 0.1

**What this task implements:**
The accessibility validation utilities in `backend/src/pipeline/tokens/accessibility.ts`. These are pure functions used both in the generation pipeline (semantic token auto-correction) and in tests (cross-hue consistency validation). This task has no dependency on Task 0.2 and can be worked in parallel.

**Files to create or modify:**
- `backend/src/pipeline/tokens/accessibility.ts` — `contrastRatio`, `meetsAA`, `meetsAAA`, `findAccessibleStep`
- `backend/tests/pipeline/tokens/accessibility.test.ts` — Tests for this task

**Acceptance criteria:**
- [ ] `contrastRatio(hex1: string, hex2: string): number` returns a number ≥ 1.0 for any valid hex pair, using the WCAG relative luminance formula
- [ ] `contrastRatio('#ffffff', '#ffffff')` returns `1.0` (±0.01)
- [ ] `contrastRatio('#000000', '#ffffff')` returns `21.0` (±0.1)
- [ ] `contrastRatio('#3b82f6', '#ffffff')` returns a known pre-computed value (calculate it once, assert it in the test — this pins the implementation)
- [ ] `meetsAA('#000000', '#ffffff', false)` returns `true`; `meetsAA('#ffffff', '#ffffff', false)` returns `false`
- [ ] `meetsAA` large text threshold is 3:1; normal text threshold is 4.5:1
- [ ] `meetsAAA` normal text threshold is 7:1
- [ ] `findAccessibleStep(scale, background, minRatio)` returns the hex value from `scale` whose contrast against `background` is closest to `minRatio` from above (i.e. the darkest step that still passes, not the lightest)
- [ ] `findAccessibleStep` returns the input step unchanged if it already meets `minRatio`
- [ ] `findAccessibleStep` throws a descriptive error if no step in the scale meets `minRatio`
- [ ] Tests pass: `cd backend && npm test -- --testPathPattern=accessibility`
- [ ] `tsc --noEmit` passes in `backend`
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- Must not implement any token generation or mapping logic — this file is utilities only
- Must not depend on Task 0.2 (color scale generation) — these utilities are standalone

---

### Task 0.4 — Primitive token generation

> **Status:** `[ ]` Not started
> **Session:** —
> **Depends on:** Tasks 0.2 and 0.3

**What this task implements:**
The `generatePrimitives` function in `backend/src/pipeline/tokens/primitives.ts`. Given a `ProjectConfig`, produces the full primitive token set: color scales for all hue families, spacing scale, type size scale, radius steps, and shadow definitions.

**Files to create or modify:**
- `backend/src/pipeline/tokens/primitives.ts` — `generatePrimitives(config: ProjectConfig): PrimitiveTokenSet`
- `backend/src/pipeline/palette/personalities.ts` — Mapping tables: density → base spacing unit, personality → radius values, dimensionality → shadow definitions
- `packages/types/src/output.ts` — Add `PrimitiveTokenSet` type if not already defined
- `backend/tests/pipeline/tokens/primitives.test.ts` — Tests for this task

**Acceptance criteria:**
- [ ] `generatePrimitives` accepts a valid `ProjectConfig` and returns a `PrimitiveTokenSet` with non-empty `colors`, `spacing`, `typeSizes`, `radii`, and `shadows` fields
- [ ] Output `colors` contains one entry per hue family present in the config: always `primary` and `neutral`, plus `secondary` and `accent` if present in `config.color`
- [ ] Each color scale has exactly 19 keys: `50, 100, 150 ... 950`
- [ ] `DEFAULT_CONFIG` produces a primary scale whose shade 500 is visually mid-range (contrast against white between 3.0 and 5.0) — assert the actual contrast value
- [ ] Spacing scale for `compact` density has `space-2` = `6px` (3px base × 2 multiplier); `balanced` has `space-2` = `8px`; `spacious` has `space-2` = `10px`
- [ ] Type size scale for ratio `1.25` has 7 steps; the `text-base` step is `1rem`; `text-lg` is `1.25rem`
- [ ] Radius values differ between `sharp`, `soft`, `rounded` personality settings
- [ ] `flat` dimensionality produces `none` for all three shadow steps
- [ ] Non-flat dimensionality produces non-`none` shadow values for all three steps
- [ ] Primitives are mode-agnostic: adding `'dark'` to `config.modes` does not change the primitive output
- [ ] Tests pass: `cd backend && npm test -- --testPathPattern=primitives`
- [ ] `tsc --noEmit` passes
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- Must not implement semantic token mapping — that is Task 0.5
- Must not apply accessibility validation to primitives — validation happens in semantic layer

---

### Task 0.5 — Semantic token generation

> **Status:** `[ ]` Not started
> **Session:** —
> **Depends on:** Task 0.4

**What this task implements:**
The `generateSemanticTokens` function in `backend/src/pipeline/tokens/semantic.ts`. Maps primitive tokens to semantic roles, generates dual-mode values for dark mode configs, and runs WCAG AA validation with auto-correction on every foreground/background pairing.

**Files to create or modify:**
- `backend/src/pipeline/tokens/semantic.ts` — `generateSemanticTokens(primitives: PrimitiveTokenSet, config: ProjectConfig): SemanticTokenSet`
- `packages/types/src/output.ts` — Add `SemanticTokenSet` and `TokenCorrection` types
- `backend/tests/pipeline/tokens/semantic.test.ts` — Tests for this task

**Acceptance criteria:**
- [ ] Output contains all semantic color token keys listed in `docs/design-system-spec.md` § Layer 2 — Semantic Tokens (verify by asserting each key exists in the output)
- [ ] All foreground/background pairs in the output meet WCAG AA: `contrastRatio(fg, bg) >= 4.5` for normal text pairs; `>= 3.0` for UI component pairs. Test this programmatically across the full output for `DEFAULT_CONFIG`
- [ ] A config with a very light primary color (e.g. `primaryHex: '#a8c5f5'`) triggers at least one auto-correction — the `corrections` array on the output is non-empty
- [ ] Auto-corrected tokens still meet WCAG AA
- [ ] Single-mode config (`modes: ['light']`) produces one value per semantic color token
- [ ] Dual-mode config (`modes: ['light', 'dark']`) produces distinct light and dark values for every semantic color token
- [ ] Dark mode values differ from light mode values for surface and text tokens (assert they are not equal)
- [ ] Typography, spacing, radius, and shadow semantic tokens are present in the output
- [ ] Tests pass: `cd backend && npm test -- --testPathPattern=semantic`
- [ ] `tsc --noEmit` passes
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- Must not implement component-specific token assignments — that is Task 0.6
- Must not generate any component code or documentation

---

### Task 0.6 — Component token generation

> **Status:** `[ ]` Not started
> **Session:** —
> **Depends on:** Task 0.5

**What this task implements:**
The `generateComponentTokens` function in `backend/src/pipeline/tokens/component.ts`. Produces per-component token assignments (padding, border-radius, font-weight, etc.) that reference semantic tokens and vary by shape config.

**Files to create or modify:**
- `backend/src/pipeline/tokens/component.ts` — `generateComponentTokens(semantic: SemanticTokenSet, config: ProjectConfig): ComponentTokenSet`
- `packages/types/src/output.ts` — Add `ComponentTokenSet` type
- `backend/tests/pipeline/tokens/component.test.ts` — Tests for this task

**Acceptance criteria:**
- [ ] Output contains component token entries for all Tier 1 components: `button`, `input`, `select`, `checkbox`, `radio`, `switch`, `dialog`, `tooltip`, `popover`, `tabs`, `menu`, `slider`
- [ ] Output contains component token entries for all Tier 2 components: `form-field`, `card`, `badge`, `alert`, `avatar`
- [ ] `button.padding.sm`, `button.padding.md`, `button.padding.lg` are all present and reference spacing tokens
- [ ] `button.border-radius` references a radius token
- [ ] `compact` density config produces smaller padding token values than `spacious` density config — assert by comparing the resolved spacing values
- [ ] `sharp` personality config produces a smaller border-radius token value than `rounded` personality config
- [ ] Tests pass: `cd backend && npm test -- --testPathPattern=component`
- [ ] `tsc --noEmit` passes
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- Must not generate component source code (`.tsx` files) — that is Task 0.7
- Must not reference primitive tokens directly — component tokens reference semantic tokens only

---

### Task 0.7 — Component code generation

> **Status:** `[ ]` Not started
> **Session:** —
> **Depends on:** Task 0.6

**What this task implements:**
The component code generators in `backend/src/pipeline/components/`. Each component generator is a function that returns a string of production-ready TypeScript/TSX source code for one component. All Tier 1 and Tier 2 components are implemented.

**Files to create or modify:**
- `backend/src/pipeline/components/index.ts` — `generateComponents(config: ProjectConfig, tokens: AllTokenSets): GeneratedComponentFiles`
- `backend/src/pipeline/components/button.ts` — and one file per component
- `backend/src/pipeline/components/form-field.ts` — Tier 2
- `backend/src/pipeline/components/card.ts` — Tier 2
- `backend/src/pipeline/components/badge.ts` — Tier 2
- `backend/src/pipeline/components/alert.ts` — Tier 2
- `backend/src/pipeline/components/avatar.ts` — Tier 2
- `backend/tests/pipeline/components/codegen.test.ts` — Tests for this task

**Implementation approach:** Template strings, not an AST. Each component generator is a TypeScript function returning a string. See the Button example in `docs/design-system-spec.md` § Tier 1 Components for the expected code pattern.

**Acceptance criteria:**
- [ ] Every component generator returns a non-empty string for `DEFAULT_CONFIG`
- [ ] Generated Button code contains all four variant strings: `primary`, `secondary`, `ghost`, `destructive`
- [ ] Generated Button code contains all three size strings: `sm`, `md`, `lg`
- [ ] Generated Button code contains a `focus-visible` class reference (accessibility requirement)
- [ ] Generated Button code does not contain any primitive token names (e.g. `color.blue.600`) — only semantic/component token CSS custom property references
- [ ] Every generated component file imports from `@base-ui-components/react/[component]`
- [ ] A component whose category is not in `config.componentScope` is not included in the output
- [ ] No generated file contains the strings `TODO`, `FIXME`, `placeholder`, or `console.log`
- [ ] **TypeScript compilation test:** Write all generated component files to a temp directory, run `tsc --noEmit` on them with a tsconfig that includes `@base-ui-components/react` and `react` types — assert zero errors
- [ ] Tests pass: `cd backend && npm test -- --testPathPattern=codegen`
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- Must not generate documentation files — that is Task 0.8
- Must not generate token files — those are separate serialization tasks (Task 0.9)
- Must not add any UI state, network calls, or side effects to generator functions

---

### Task 0.8 — Documentation generation

> **Status:** `[ ]` Not started
> **Session:** —
> **Depends on:** Task 0.7

**What this task implements:**
The documentation generators in `backend/src/pipeline/docs/`. Produces `README.md`, `tokens.md`, `components.md`, `decisions.md`, and `agent-spec.json` as strings from the assembled `GeneratedSystem` intermediate object.

**Files to create or modify:**
- `backend/src/pipeline/docs/readme.ts` — `generateReadme(system: GeneratedSystem, config: ProjectConfig): string`
- `backend/src/pipeline/docs/tokens-doc.ts` — `generateTokensDoc(system: GeneratedSystem): string`
- `backend/src/pipeline/docs/components-doc.ts` — `generateComponentsDoc(system: GeneratedSystem, config: ProjectConfig): string`
- `backend/src/pipeline/docs/decisions.ts` — `generateDecisions(config: ProjectConfig): string` — rationale template system
- `backend/src/pipeline/docs/agent-spec.ts` — `generateAgentSpec(system: GeneratedSystem, config: ProjectConfig): string`
- `backend/tests/pipeline/docs/docs.test.ts` — Tests for this task

**Acceptance criteria:**
- [ ] `generateReadme` output contains all five required sections: installation, token usage, dark mode, component usage, how to regenerate
- [ ] `generateTokensDoc` output contains every semantic token name from `docs/design-system-spec.md` § Layer 2 — assert by checking for at least: `color.action.primary`, `color.surface.default`, `color.text.primary`, `font.family.body`
- [ ] `generateComponentsDoc` output contains a section for every component in the scope — assert by checking for `Button`, `Input`, `FormField`
- [ ] `generateDecisions` output for `DEFAULT_CONFIG` contains at least one paragraph for each of: type scale, border radius, color approach, spacing density — assert by checking for the presence of relevant keywords
- [ ] `generateDecisions` output for a `serif-accented` type style config produces different text than for a `geometric` config (rationale is config-specific, not generic)
- [ ] `generateAgentSpec` output is valid JSON: `JSON.parse()` does not throw
- [ ] `agent-spec.json` contains `version`, `projectId` placeholder, `tokens`, `components`, and `rules` keys
- [ ] `agent-spec.json` `components` array contains an entry for every component in scope, each with `name`, `variants`, `tokenRefs`, `accessibilityNotes`, and `usageGuidance` fields
- [ ] No generated doc file contains `TODO`, `FIXME`, or `placeholder`
- [ ] Tests pass: `cd backend && npm test -- --testPathPattern=docs`
- [ ] `tsc --noEmit` passes
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- Must not implement export serialization (W3C JSON, CSS, Tailwind config) — that is Task 0.9
- Must not make any network calls or read from the filesystem

---

### Task 0.9 — Export serialization

> **Status:** `[ ]` Not started
> **Session:** —
> **Depends on:** Task 0.8

**What this task implements:**
The export serializers in `backend/src/pipeline/export/`. Converts the in-memory `GeneratedSystem` to the specific file formats included in the export package: W3C DTCG JSON, CSS custom properties, Tailwind config, and ZIP assembly.

**Files to create or modify:**
- `backend/src/pipeline/export/w3c.ts` — `serializeToW3C(tokenSet: TokenSet): string`
- `backend/src/pipeline/export/css.ts` — `serializeToCSS(semantic: SemanticTokenSet, component: ComponentTokenSet, modes: ColorMode[]): string`
- `backend/src/pipeline/export/tailwind.ts` — `serializeToTailwind(semantic: SemanticTokenSet): string`
- `backend/src/pipeline/export/zip.ts` — `assembleZip(files: GeneratedFile[]): Promise<Buffer>`
- `backend/tests/pipeline/export/serializers.test.ts` — Tests for this task

**Acceptance criteria:**
- [ ] `serializeToW3C` output parses as valid JSON with no errors
- [ ] W3C output contains `$value` and `$type` keys on token entries
- [ ] W3C output uses `{path.to.token}` reference syntax for alias tokens (semantic referencing primitives)
- [ ] `serializeToCSS` output contains a `:root {` block
- [ ] CSS output contains `--color-action-primary` (hyphens, not dots, in custom property names)
- [ ] CSS output for a dual-mode config contains a `[data-theme="dark"] {` block with different values than `:root`
- [ ] CSS output for a single-mode config does not contain `[data-theme="dark"]`
- [ ] `serializeToTailwind` output is a string beginning with `import type { Config }` or `export default {` — valid TypeScript module syntax
- [ ] Tailwind output runs through `tsc --noEmit` without errors (write to temp file and check)
- [ ] `assembleZip` returns a `Buffer`; writing it to disk and running `unzip -t` (or equivalent) reports no errors
- [ ] ZIP contains all expected file paths from the artifact list in `docs/design-system-spec.md` § Output Artifacts
- [ ] Tests pass: `cd backend && npm test -- --testPathPattern=serializers`
- [ ] `tsc --noEmit` passes
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- Must not implement the full pipeline entry point — that is Task 0.10
- Must not write files to the filesystem — serializers return strings/buffers only

---

### Task 0.10 — Full pipeline integration

> **Status:** `[ ]` Not started
> **Session:** —
> **Depends on:** Task 0.9

**What this task implements:**
The `generate` entry point in `backend/src/pipeline/index.ts` that calls all sub-generators in sequence and assembles the complete `GeneratedSystem`. A comprehensive integration test validates the full output end-to-end.

**Files to create or modify:**
- `backend/src/pipeline/index.ts` — `generate(config: ProjectConfig): GeneratedSystem`
- `backend/tests/pipeline/integration.test.ts` — Full pipeline integration tests

**Acceptance criteria:**
- [ ] `generate(DEFAULT_CONFIG)` returns without throwing
- [ ] Output contains all file paths listed in `docs/design-system-spec.md` § Output Artifacts — assert each path is present in the output's `files` array
- [ ] All three W3C JSON files (`tokens/primitives.json`, `tokens/semantic.json`, `tokens/component.json`) parse as valid JSON
- [ ] `tokens/variables.css` contains a `:root {` block
- [ ] `tokens/tailwind.config.ts` runs through `tsc --noEmit` without errors
- [ ] All component `.tsx` files in the output run through `tsc --noEmit` without errors (write all to a temp directory with appropriate tsconfig, run compiler once)
- [ ] `docs/agent-spec.json` parses as valid JSON with all required top-level keys
- [ ] No generated file content contains `TODO`, `FIXME`, `placeholder`, or `console.log`
- [ ] All WCAG AA requirements are met in the semantic token output — run `contrastRatio` on every foreground/background pair and assert all are ≥ 4.5 (normal text) or ≥ 3.0 (UI components)
- [ ] `generate(DEFAULT_CONFIG)` completes in under 200ms (use `performance.now()` around the call and assert)
- [ ] `generate` with full config (all scope categories, dual mode) completes in under 200ms
- [ ] `generate` is deterministic: calling it twice with identical config produces identical output (deep-equal assertion on both results)
- [ ] `generate` works correctly for all four `typeStyle` values, both `colorSource` values, and all three `density` values — write a parameterized test
- [ ] All tests pass: `cd backend && npm test`
- [ ] `tsc --noEmit` passes in `backend` and `packages/types`
- [ ] `eslint .` passes with zero errors
- [ ] `SESSION_LOG.md` updated with full session entry and phase-complete status in Current State block

**Must not do:**
- Must not implement any API routes — those are Phase 1
- Must not write files to the filesystem — the pipeline returns data, it does not write files

---

## Phase completion checklist

- [ ] All 10 tasks above are marked `[x]`
- [ ] `npm test` passes in `backend` with zero failures — paste final test output into `logs/phase-0-retro.md`
- [ ] `tsc --noEmit` passes in `packages/types` and `backend`
- [ ] `eslint .` passes with zero errors
- [ ] No Playwright tests yet — N/A for this phase
- [ ] `SESSION_LOG.md` has a complete entry for every session in this phase
- [ ] `docs/design-system-plan-summary.md` updated: Phase 0 marked Complete
- [ ] `docs/user-journeys.md` reviewed — no journey steps are enabled by Phase 0 (pipeline only, no user-facing behavior)
- [ ] Phase retrospective written to `logs/phase-0-retro.md`
- [ ] Housekeeping session run
- [ ] `tasks/phase-1.md` generated, reviewed, and committed

---

## Completed task log

*(Tasks compressed here once complete.)*