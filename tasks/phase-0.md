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
- `packages/types/src/config.ts` — Full `ProjectConfig` type and all constituent types (`ProjectType`, `ComponentCategory`, `ColorMode`, `Density`, `Personality`, `TypeStyle`, `Dimensionality`, `ColorSource`, `ColorDirection`, `ColorConfig`, `TypographyConfig`, `ShapeConfig`); also exports `ProjectConfigSchema` (Zod schema)
- `packages/types/src/output.ts` — `GeneratedSystem`, `GeneratedFile`, `TokenSet`, `ColorScale` types
- `packages/types/src/api.ts` — Request/response shapes for generation and project API routes
- `packages/types/src/index.ts` — Barrel export of all types and the Zod schema
- `backend/src/pipeline/palette/defaults.ts` — `DEFAULT_CONFIG` constant and `SAFE_DEFAULT_PRIMARIES` array (8 pre-validated seed colors)
- `backend/tests/pipeline/types.test.ts` — Tests for this task

**Acceptance criteria:**
- [ ] All types in `packages/types/src/config.ts` match the definitions in `docs/design-system-dev-plan.md` § The `ProjectConfig` Type exactly — verify by code review against that section
- [ ] `ProjectConfigSchema` (Zod) is exported from `packages/types/src/index.ts` and accepts `DEFAULT_CONFIG` without throwing
- [ ] `DEFAULT_CONFIG.color.primaryHex` is `'#3b82f6'`
- [ ] `DEFAULT_CONFIG` passes `ProjectConfigSchema.parse()` in a test — this is the canonical validity check
- [ ] `SAFE_DEFAULT_PRIMARIES` has exactly 8 members and every member matches `/^#[0-9a-f]{6}$/i`
- [ ] `tsc` (emit mode) builds `packages/types` with zero errors and writes declaration files to `packages/types/dist/`
- [ ] `tsc --noEmit` passes in both `packages/types` and `backend` with zero errors
- [ ] `backend` can import `ProjectConfig` from `@ds-gen/types` in a test file without TypeScript errors (workspace symlink resolves correctly after `npm install`)
- [ ] Tests pass: `cd backend && npm test -- types`
- [ ] `SESSION_LOG.md` updated with session entry and new Current State block

**Must not do:**
- Must not implement any pipeline logic — no color generation, no token mapping, no code generation
- Must not add runtime dependencies not already in `package.json` — types and Zod only; Zod is already listed

---

### Task 0.2 — Color scale generation

> **Status:** `[ ]` Not started
> **Session:** —
> **Depends on:** Task 0.1

**What this task implements:**
The `generateColorScale` function in `backend/src/pipeline/palette/generator.ts`. Given a seed hex color, produces a 19-step scale (shades 50–950 in increments of 50) where each shade is selected by contrast ratio against a fixed `TARGET_CONTRASTS` table, producing cross-hue contrast consistency across all generated scales.

**Note for implementation:** A reference script implementing this algorithm is at `reference/color-scale-generator.reference.ts`. Read it before writing any code. You may integrate it directly (adapting to the required interface) or rewrite it cleanly — the output contract is what matters, not the implementation. The reference uses `chroma-js`.

**Files to create or modify:**
- `backend/src/pipeline/palette/generator.ts` — `generateColorScale(seedHex: string): ColorScale` and `TARGET_CONTRASTS: Record<number, number>`
- `backend/tests/pipeline/palette/generator.test.ts` — Tests for this task

**Acceptance criteria:**
- [ ] `generateColorScale` accepts a hex string and returns a `ColorScale` with exactly 19 keys: `50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950`
- [ ] All returned values are valid 6-digit hex strings matching `/^#[0-9a-f]{6}$/i`
- [ ] `TARGET_CONTRASTS` is exported and contains an entry for every one of the 19 shade keys
- [ ] Shade 50 has a WCAG contrast ratio against `#ffffff` less than 1.5 for any chromatic input (near-white end of scale)
- [ ] Shade 950 has a WCAG contrast ratio against `#000000` less than 1.5 for any chromatic input (near-black end of scale)
- [ ] **Cross-hue consistency test:** For shades 100, 300, 500, 700, 900 — the contrast ratio of that shade against white (for 100/300) or black (for 700/900) is within ±0.3 of `TARGET_CONTRASTS[shade]` for each of four hues: `#3b82f6` (blue), `#e63946` (red), `#16a34a` (green), `#d97706` (amber)
- [ ] A gray seed (`#808080`) produces a valid 19-step scale with no errors thrown
- [ ] The function is pure: two calls with identical input return identical output (deep-equal assertion)
- [ ] Tests pass: `cd backend && npm test -- generator`
- [ ] `tsc --noEmit` passes in `backend`
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- Must not generate the full primitive token set — that is Task 0.4
- Must not implement WCAG validation utilities — those are Task 0.3
- Must not use OKLCH interpolation — the algorithm operates on brightness adjustments via `chroma-js`

---

### Task 0.3 — WCAG contrast validation

> **Status:** `[ ]` Not started
> **Session:** —
> **Depends on:** Task 0.1

**What this task implements:**
The accessibility validation utilities in `backend/src/pipeline/tokens/accessibility.ts`. These are pure functions used in the semantic token generator (auto-correction) and in tests (cross-hue consistency validation). This task has no dependency on Task 0.2 and can be worked in parallel with it.

**Files to create or modify:**
- `backend/src/pipeline/tokens/accessibility.ts` — `contrastRatio`, `meetsAA`, `meetsAAA`, `findAccessibleStep`
- `backend/tests/pipeline/tokens/accessibility.test.ts` — Tests for this task

**Acceptance criteria:**
- [ ] `contrastRatio(hex1: string, hex2: string): number` returns a number ≥ 1.0 for any valid hex pair using the WCAG relative luminance formula
- [ ] `contrastRatio('#ffffff', '#ffffff')` returns `1.0` (±0.01)
- [ ] `contrastRatio('#000000', '#ffffff')` returns `21.0` (±0.1)
- [ ] `contrastRatio('#3b82f6', '#ffffff')` returns a pre-computed known value — calculate it once, hard-code it as the expected value in the test, and assert it matches to two decimal places (this pins the implementation against drift)
- [ ] `meetsAA('#000000', '#ffffff', false)` returns `true`; `meetsAA('#ffffff', '#ffffff', false)` returns `false`
- [ ] `meetsAA` uses threshold 4.5 for normal text (`largeText = false`) and 3.0 for large text (`largeText = true`)
- [ ] `meetsAAA` uses threshold 7.0 for normal text and 4.5 for large text
- [ ] `findAccessibleStep(scale, background, minRatio)` returns the hex value from `scale` whose contrast against `background` meets `minRatio` — specifically, the step that is closest to `minRatio` from above (the darkest shade that still passes, not the lightest)
- [ ] `findAccessibleStep` returns the input step unchanged if it already meets `minRatio`
- [ ] `findAccessibleStep` throws a descriptive error (not a silent undefined return) if no step in the scale meets `minRatio`
- [ ] Tests pass: `cd backend && npm test -- accessibility`
- [ ] `tsc --noEmit` passes in `backend`
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- Must not implement any token generation or mapping logic — this file is utilities only
- Must not import from Task 0.2 (color scale generation) — these utilities are standalone

---

### Task 0.4 — Primitive token generation

> **Status:** `[ ]` Not started
> **Session:** —
> **Depends on:** Tasks 0.2 and 0.3

**What this task implements:**
The `generatePrimitives` function in `backend/src/pipeline/tokens/primitives.ts`. Given a `ProjectConfig`, produces the full primitive token set: color scales for all hue families, spacing scale, type size scale, radius steps, and shadow definitions.

**Files to create or modify:**
- `backend/src/pipeline/tokens/primitives.ts` — `generatePrimitives(config: ProjectConfig): PrimitiveTokenSet`
- `backend/src/pipeline/palette/personalities.ts` — Mapping tables: `Density` → base spacing unit (px), `Personality` → radius step values (four named steps), `Dimensionality` → shadow definitions (three named steps)
- `packages/types/src/output.ts` — Add `PrimitiveTokenSet` type if not already present
- `backend/tests/pipeline/tokens/primitives.test.ts` — Tests for this task

**Acceptance criteria:**
- [ ] `generatePrimitives(DEFAULT_CONFIG)` returns a `PrimitiveTokenSet` with non-empty `colors`, `spacing`, `typeSizes`, `radii`, and `shadows` fields
- [ ] `colors` contains exactly one entry for `primary` and one for `neutral` when only those hue families are present in the config; also contains `secondary` and `accent` entries when those are set in `config.color`
- [ ] Each color scale has exactly 19 keys: `50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950`
- [ ] Spacing scale for `compact` density: `space-2` = `'6px'` (3px base × 2 multiplier)
- [ ] Spacing scale for `balanced` density: `space-2` = `'8px'` (4px base × 2 multiplier)
- [ ] Spacing scale for `spacious` density: `space-2` = `'10px'` (5px base × 2 multiplier)
- [ ] Type size scale for ratio `1.25` produces 7 steps; `text-base` = `'1rem'`; `text-lg` = `'1.25rem'`
- [ ] Type size scale for ratio `1.333` produces 7 steps; `text-lg` = `'1.333rem'` (±0.001)
- [ ] Radius step values differ between `professional` personality and `approachable` personality — assert that `radii['radius-md']` is not equal between configs using those two values
- [ ] `flat` dimensionality produces `'none'` for all three shadow steps (`shadow-sm`, `shadow-md`, `shadow-lg`)
- [ ] `subtle` and `dimensional` dimensionality each produce non-`'none'` values for all three shadow steps
- [ ] Primitives are mode-agnostic: `generatePrimitives` called with `{ ...DEFAULT_CONFIG, modes: ['light', 'dark'] }` returns output identical to `generatePrimitives(DEFAULT_CONFIG)` (deep-equal)
- [ ] Tests pass: `cd backend && npm test -- primitives`
- [ ] `tsc --noEmit` passes in `backend`
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- Must not implement semantic token mapping — that is Task 0.5
- Must not apply WCAG validation — accessibility validation happens in the semantic layer, not on primitives

---

### Task 0.5 — Semantic token generation

> **Status:** `[ ]` Not started
> **Session:** —
> **Depends on:** Task 0.4

**What this task implements:**
The `generateSemanticTokens` function in `backend/src/pipeline/tokens/semantic.ts`. Maps primitive tokens to semantic roles, generates distinct light and dark values for dual-mode configs, and runs WCAG AA validation with auto-correction on every foreground/background pairing before returning.

**Files to create or modify:**
- `backend/src/pipeline/tokens/semantic.ts` — `generateSemanticTokens(primitives: PrimitiveTokenSet, config: ProjectConfig): SemanticTokenSet`
- `packages/types/src/output.ts` — Add `SemanticTokenSet` and `TokenCorrection` types
- `backend/tests/pipeline/tokens/semantic.test.ts` — Tests for this task

**Acceptance criteria:**
- [ ] Output contains all semantic color token keys defined in `docs/design-system-spec.md` § Layer 2 — Semantic Tokens; assert each of these is present: `color.action.primary`, `color.action.primary.hover`, `color.action.primary.fg`, `color.action.secondary`, `color.action.secondary.fg`, `color.action.destructive`, `color.action.destructive.fg`, `color.surface.default`, `color.surface.raised`, `color.surface.overlay`, `color.surface.subtle`, `color.text.primary`, `color.text.secondary`, `color.text.disabled`, `color.text.on-action`, `color.border.default`, `color.border.strong`, `color.border.action`, `color.feedback.success`, `color.feedback.warning`, `color.feedback.error`, `color.feedback.info`
- [ ] Output contains all typography semantic tokens: `font.family.display`, `font.family.body`, `font.family.ui`, `font.family.code`, and `font.size.xs` through `font.size.5xl`, and `font.weight.normal`, `.medium`, `.semibold`, `.bold`, and `font.line-height.tight`, `.normal`, `.relaxed`
- [ ] Output contains spacing, radius, and shadow semantic tokens
- [ ] **WCAG AA enforcement:** For every foreground/background semantic color pair in the output, `contrastRatio(fg, bg) >= 4.5` for text pairs and `>= 3.0` for UI component pairs — assert programmatically across the full output for `DEFAULT_CONFIG`
- [ ] A config with `primaryHex: '#a8c5f5'` (a very light blue that fails AA against white) triggers at least one auto-correction — the `corrections` array on the output is non-empty
- [ ] All tokens in a corrected output still meet WCAG AA — run the same contrast assertion on the corrected output
- [ ] Single-mode config (`modes: ['light']`) produces one resolved value per semantic color token
- [ ] Dual-mode config (`modes: ['light', 'dark']`) produces two resolved values per semantic color token: `light` and `dark`
- [ ] Dark mode values differ from light mode values for `color.surface.default` and `color.text.primary` — assert they are not equal
- [ ] Tests pass: `cd backend && npm test -- semantic`
- [ ] `tsc --noEmit` passes in `backend`
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- Must not implement component-specific token assignments — that is Task 0.6
- Must not generate component code or documentation

---

### Task 0.6 — Component token generation

> **Status:** `[ ]` Not started
> **Session:** —
> **Depends on:** Task 0.5

**What this task implements:**
The `generateComponentTokens` function in `backend/src/pipeline/tokens/component.ts`. Produces per-component token assignments (padding, border-radius, font-weight, etc.) that reference semantic tokens by name and vary by shape config.

**Files to create or modify:**
- `backend/src/pipeline/tokens/component.ts` — `generateComponentTokens(semantic: SemanticTokenSet, config: ProjectConfig): ComponentTokenSet`
- `packages/types/src/output.ts` — Add `ComponentTokenSet` type
- `backend/tests/pipeline/tokens/component.test.ts` — Tests for this task

**Acceptance criteria:**
- [ ] Output contains component token entries for all 12 Tier 1 components: `button`, `input`, `select`, `checkbox`, `radio`, `switch`, `dialog`, `tooltip`, `popover`, `tabs`, `menu`, `slider`
- [ ] Output contains component token entries for all 5 Tier 2 components: `form-field`, `card`, `badge`, `alert`, `avatar`
- [ ] `button.padding.sm`, `button.padding.md`, and `button.padding.lg` are all present in the output
- [ ] `button.border-radius` is present in the output
- [ ] `input.padding`, `input.border-radius`, `input.border-color`, and `input.border-color.focus` are present in the output
- [ ] `compact` density config produces smaller resolved spacing values for `button.padding.md` than `spacious` density config — assert by comparing the numeric part of the resolved value strings
- [ ] `professional` personality config produces a different `button.border-radius` value than `approachable` personality config — assert they are not equal
- [ ] All token values in the output reference semantic token names (e.g. `space.component.sm`), not primitive token names (e.g. `space-2`) or raw px values — assert no value starts with `space-` or matches `/^\d+px$/`
- [ ] Tests pass: `cd backend && npm test -- tokens/component`
- [ ] `tsc --noEmit` passes in `backend`
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
The component code generators in `backend/src/pipeline/components/`. Each generator is a TypeScript function returning a string of production-ready TSX source code. All 12 Tier 1 and 5 Tier 2 components are implemented.

**Implementation approach:** Template strings, not an AST. Each component generator is a function that returns a string. See the Button pattern in `docs/design-system-spec.md` § Tier 1 Components for the expected code shape.

**Note on Base UI package name:** `@base-ui-components/react` was renamed to `@base-ui/react` on npm (the installed `1.0.0-rc.0` version warns about this). Before writing component generators, check whether `@base-ui/react` is now the correct import path and update `frontend/` and `preview-sandbox/` package.json dependencies if so. Generated component code must use the package name that is actually installed.

**Files to create or modify:**
- `backend/src/pipeline/components/index.ts` — `generateComponents(config: ProjectConfig, tokens: { semantic: SemanticTokenSet, component: ComponentTokenSet }): GeneratedFile[]`
- One file per Tier 1 component: `button.ts`, `input.ts`, `select.ts`, `checkbox.ts`, `radio.ts`, `switch.ts`, `dialog.ts`, `tooltip.ts`, `popover.ts`, `tabs.ts`, `menu.ts`, `slider.ts`
- One file per Tier 2 component: `form-field.ts`, `card.ts`, `badge.ts`, `alert.ts`, `avatar.ts`
- `backend/tests/pipeline/components/codegen.test.ts` — Tests for this task
- `backend/tests/pipeline/output/components.test.ts` — TypeScript compilation test for generated output

**Acceptance criteria:**
- [ ] Every component generator returns a non-empty string for `DEFAULT_CONFIG`
- [ ] Generated Button code contains all four variant strings: `'primary'`, `'secondary'`, `'ghost'`, `'destructive'`
- [ ] Generated Button code contains all three size strings: `'sm'`, `'md'`, `'lg'`
- [ ] Generated Button code contains `'focus-visible'` (accessibility requirement — must not be omitted)
- [ ] Generated Button code contains no primitive token names — assert the output does not match `/color\.\w+\.\d+/` (e.g. `color.blue.600` would match and fail)
- [ ] Every generated component file contains a Base UI import from the correct package name (confirm whether `@base-ui-components/react` or `@base-ui/react` — whichever is installed)
- [ ] A component whose category is not in `config.componentScope` is absent from the output of `generateComponents` — test with `componentScope: ['forms']` and assert no navigation components are generated
- [ ] No generated file content contains any of: `'TODO'`, `'FIXME'`, `'placeholder'`, `'console.log'`
- [ ] **TypeScript compilation test** (in `output/components.test.ts`): write all generated `.tsx` files from `DEFAULT_CONFIG` to a temp directory with an appropriate `tsconfig.json` (including `react`, `react-dom`, and the Base UI package types), run `tsc --noEmit` on that directory, and assert zero errors
- [ ] Tests pass: `cd backend && npm test -- components/codegen`
- [ ] Output compilation test passes: `cd backend && npm test -- output/components`
- [ ] `tsc --noEmit` passes in `backend`
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- Must not generate documentation files — that is Task 0.8
- Must not generate token files — that is Task 0.9
- Must not add side effects, network calls, or `fs` writes inside generator functions

---

### Task 0.8 — Documentation generation

> **Status:** `[ ]` Not started
> **Session:** —
> **Depends on:** Task 0.7

**What this task implements:**
The documentation generators in `backend/src/pipeline/docs/`. Each generator is a pure function returning a string. Produces `README.md`, `tokens.md`, `components.md`, `decisions.md`, and `agent-spec.json` from the `GeneratedSystem` intermediate object and the `ProjectConfig`.

**Files to create or modify:**
- `backend/src/pipeline/docs/readme.ts` — `generateReadme(system: GeneratedSystem, config: ProjectConfig): string`
- `backend/src/pipeline/docs/tokens-doc.ts` — `generateTokensDoc(system: GeneratedSystem): string`
- `backend/src/pipeline/docs/components-doc.ts` — `generateComponentsDoc(system: GeneratedSystem, config: ProjectConfig): string`
- `backend/src/pipeline/docs/decisions.ts` — `generateDecisions(config: ProjectConfig): string`
- `backend/src/pipeline/docs/agent-spec.ts` — `generateAgentSpec(system: GeneratedSystem, config: ProjectConfig): string`
- `backend/tests/pipeline/docs/docs.test.ts` — Tests for this task

**Acceptance criteria:**
- [ ] `generateReadme` output contains all six required sections: what was generated, installation, token usage, dark mode, component usage, how to regenerate — assert by checking for distinct section heading strings for each
- [ ] `generateTokensDoc` output contains every semantic token name from `docs/design-system-spec.md` § Layer 2 — assert at minimum: `color.action.primary`, `color.surface.default`, `color.text.primary`, `font.family.body`
- [ ] `generateComponentsDoc` output contains a section for every component in the default scope — assert by checking for `'Button'`, `'Input'`, and `'Form Field'`
- [ ] `generateDecisions(DEFAULT_CONFIG)` output contains at least one paragraph for each of: type scale, border radius, color approach, spacing density — assert by checking for at least one keyword from each category
- [ ] `generateDecisions` output for a `serif-accented` TypeStyle config differs from its output for a `geometric` config — assert the two strings are not equal (the rationale must be config-specific)
- [ ] `generateAgentSpec` output is valid JSON: `JSON.parse(generateAgentSpec(...))` does not throw
- [ ] Parsed `agent-spec.json` has all required top-level keys: `version`, `projectId`, `projectName`, `generatedAt`, `config`, `tokens`, `components`, `rules`
- [ ] Parsed `agent-spec.json` `components` array contains an entry for every component in `DEFAULT_CONFIG` scope, each with `name`, `variants`, `tokenRefs`, `accessibilityNotes`, and `usageGuidance` fields
- [ ] No generated doc file contains any of: `'TODO'`, `'FIXME'`, `'placeholder'`
- [ ] Tests pass: `cd backend && npm test -- docs`
- [ ] `tsc --noEmit` passes in `backend`
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- Must not implement export serialization (W3C JSON, CSS, Tailwind) — that is Task 0.9
- Must not make network calls or read from the filesystem inside generator functions

---

### Task 0.9 — Export serialization

> **Status:** `[ ]` Not started
> **Session:** —
> **Depends on:** Task 0.8

**What this task implements:**
The export serializers in `backend/src/pipeline/export/`. Converts the in-memory `GeneratedSystem` to the specific file formats shipped in the export package: W3C DTCG JSON, CSS custom properties, Tailwind config, and ZIP assembly.

**Files to create or modify:**
- `backend/src/pipeline/export/w3c.ts` — `serializeToW3C(tokenSet: TokenSet): string`
- `backend/src/pipeline/export/css.ts` — `serializeToCSS(semantic: SemanticTokenSet, component: ComponentTokenSet, modes: ColorMode[]): string`
- `backend/src/pipeline/export/tailwind.ts` — `serializeToTailwind(semantic: SemanticTokenSet): string`
- `backend/src/pipeline/export/zip.ts` — `assembleZip(files: GeneratedFile[]): Promise<Buffer>`
- `backend/tests/pipeline/export/serializers.test.ts` — Tests for this task
- `backend/tests/pipeline/output/tailwind.test.ts` — TypeScript compilation test for generated Tailwind config

**Acceptance criteria:**
- [ ] `serializeToW3C` output parses as valid JSON with no errors
- [ ] W3C JSON output contains `$value` and `$type` keys on leaf token entries
- [ ] W3C JSON output uses `{path.to.token}` reference syntax for alias tokens (semantic tokens referencing primitives)
- [ ] `serializeToCSS` output contains a `:root {` block
- [ ] CSS output contains the custom property `--color-action-primary` (dots in token names become hyphens; hyphens in existing names are preserved)
- [ ] CSS output for a dual-mode config (`modes: ['light', 'dark']`) contains a `[data-theme="dark"] {` block with values that differ from the `:root` block
- [ ] CSS output for a single-mode config (`modes: ['light']`) does not contain `[data-theme="dark"]`
- [ ] `serializeToTailwind` output is a valid TypeScript module string — starts with `import type { Config }` or `export default {`
- [ ] **Tailwind TypeScript compilation test** (in `output/tailwind.test.ts`): write the serialized Tailwind config string to a temp file, run `tsc --noEmit` on it with a tsconfig that includes `tailwindcss`, assert zero errors
- [ ] `assembleZip` returns a `Buffer`
- [ ] ZIP produced by `assembleZip` contains all expected paths from `docs/design-system-spec.md` § Output Artifacts — assert these paths are present: `tokens/primitives.json`, `tokens/semantic.json`, `tokens/component.json`, `tokens/variables.css`, `tokens/tailwind.config.ts`, `components/index.ts`, `docs/README.md`, `docs/tokens.md`, `docs/components.md`, `docs/decisions.md`, `docs/agent-spec.json`, `.design-system-meta.json`
- [ ] ZIP passes integrity check: write buffer to a temp file, run `unzip -t` on it (or use `jszip` to re-parse it), assert no errors
- [ ] Tests pass: `cd backend && npm test -- serializers`
- [ ] Tailwind compilation test passes: `cd backend && npm test -- output/tailwind`
- [ ] `tsc --noEmit` passes in `backend`
- [ ] `SESSION_LOG.md` updated

**Must not do:**
- Must not implement the full pipeline entry point — that is Task 0.10
- Must not write files to the filesystem — serializers and `assembleZip` return strings and buffers, never call `fs.writeFile`

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
- [ ] Output `files` array contains all paths from `docs/design-system-spec.md` § Output Artifacts — assert each of: `tokens/primitives.json`, `tokens/semantic.json`, `tokens/component.json`, `tokens/variables.css`, `tokens/tailwind.config.ts`, `components/index.ts`, `docs/README.md`, `docs/tokens.md`, `docs/components.md`, `docs/decisions.md`, `docs/agent-spec.json`, `.design-system-meta.json`
- [ ] All three W3C JSON files parse with `JSON.parse` and contain `$value`/`$type` keys
- [ ] `tokens/variables.css` content contains a `:root {` block
- [ ] `tokens/tailwind.config.ts` content passes `tsc --noEmit` (write to temp directory and compile)
- [ ] All component `.tsx` files in the output pass `tsc --noEmit` (write all to one temp directory with a shared tsconfig and run the compiler once)
- [ ] `docs/agent-spec.json` parses as valid JSON with all required top-level keys
- [ ] No generated file content contains any of: `'TODO'`, `'FIXME'`, `'placeholder'`, `'console.log'`
- [ ] **WCAG check:** for every semantic foreground/background pair in the output, `contrastRatio(fg, bg) >= 4.5` (text) or `>= 3.0` (UI components) — assert programmatically
- [ ] `generate(DEFAULT_CONFIG)` completes in under 200ms — measure with `performance.now()` before and after the call and assert
- [ ] `generate` with full config (all six `componentScope` categories, `modes: ['light', 'dark']`) completes in under 200ms
- [ ] `generate` is deterministic: two calls with identical config produce output where every file's content is identical — assert with deep-equal on the `files` array
- [ ] **Parameterized test:** `generate` runs without errors for all four `typeStyle` values (`geometric`, `humanist`, `serif-accented`, `monospace-accented`), both `colorSource` values (`provided` with a valid hex, `generated`), and all three `density` values (`compact`, `balanced`, `spacious`)
- [ ] `generate` has no side effects — it does not log to stdout, does not call `fs`, does not make network calls — verify by asserting `console.log` was not called (spy on it before and after the call)
- [ ] All tests pass: `cd backend && npm test`
- [ ] `tsc --noEmit` passes in `packages/types` and `backend` with zero errors
- [ ] `eslint .` passes with zero errors
- [ ] `SESSION_LOG.md` updated with full session entry and phase-complete status in Current State block

**Must not do:**
- Must not implement any API routes — those are Phase 1
- Must not write files to the filesystem — `generate` returns a `GeneratedSystem` data object and does nothing else

---

## Phase completion checklist

Run this checklist in full before marking Phase 0 complete and starting Phase 1.

- [ ] All 10 tasks above are marked `[x]`
- [ ] `cd backend && npm test` passes with zero failures — paste the full test output summary into `docs/phase-0-retro.md`
- [ ] `tsc --noEmit` passes in `packages/types` with zero errors
- [ ] `tsc --noEmit` passes in `backend` with zero errors
- [ ] `eslint .` passes with zero errors from the repo root
- [ ] No Playwright tests in this phase — N/A
- [ ] `SESSION_LOG.md` has a complete entry for every session in this phase
- [ ] `docs/design-system-plan-summary.md` updated: Phase 0 marked Complete
- [ ] `docs/user-journeys.md` reviewed — no user-facing journey steps are enabled by Phase 0 (pipeline only); coverage table requires no updates
- [ ] Phase retrospective written to `docs/phase-0-retro.md`
- [ ] Housekeeping session run (task compression, session log archival, patterns review)
- [ ] `tasks/phase-1.md` generated, reviewed, and committed before starting Phase 1

---

## Completed task log

*(Tasks are compressed to this format once complete. Full details live in the session log.)*

<!--
### Task 0.X — [Task name] ✓
**Output:** [One sentence: what was built.]
**Key decisions:** [Any non-obvious choices made.]
**Session:** [Date / SESSION_LOG pointer]
-->
