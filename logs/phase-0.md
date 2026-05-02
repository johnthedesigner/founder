# Session Log — Design System Generator

## Current State

**Phase:** 0 — Pipeline Foundation
**Next task:** Phase 1 — API + database (pending phase-1.md authoring)
**What's built:** Phase 0 complete. All 10 tasks done. Full pipeline: `generate(config)` produces a `GeneratedSystem` with 12+ output files — W3C token JSON, CSS custom properties, Tailwind config, 17 component TSX files, barrel export, 5 doc files, metadata. 201 tests passing across 12 test files.
**Open questions:** None.

---

## 2026-05-01 — Task 0.1: Types and defaults

**What was done:**

- Implemented `packages/types/src/config.ts`: all `ProjectConfig` constituent types (`ProjectType`, `ComponentCategory`, `ColorMode`, `Density`, `Personality`, `TypeStyle`, `Dimensionality`, `ColorSource`, `ColorDirection`, `ColorConfig`, `TypographyConfig`, `ShapeConfig`, `ProjectConfig`) plus full Zod schema (`ProjectConfigSchema` and all sub-schemas). Hex validation regex applied to all color fields.
- Implemented `packages/types/src/output.ts`: `ColorScale`, `GeneratedFile`, `TokenSet`, `PrimitiveTokenSet`, `SemanticColorValue`, `TokenCorrection`, `SemanticTokenSet`, `ComponentTokenSet`, `ComponentSpec`, `GeneratedSystem`. Types for all three token layers and the full system output are defined now so later tasks only add implementations, not new types.
- Implemented `packages/types/src/api.ts`: request/response shapes for all API routes (auth, projects, generation, agent API, CLI manifest, health).
- Implemented `packages/types/src/index.ts`: barrel re-export of all types and Zod schemas.
- Added `"zod": "^3.24.1"` to `packages/types/package.json` and ran `npm install`.
- Built `packages/types` with `tsc` — declarations emitted to `dist/` (4 `.d.ts` files).
- Implemented `backend/src/pipeline/palette/defaults.ts`: `DEFAULT_CONFIG` matching the spec exactly; `SAFE_DEFAULT_PRIMARIES` with 8 distinct hex seeds (blue, indigo, violet, emerald, amber, rose, cyan, orange).
- Updated `backend/vitest.config.ts` to alias `@ds-gen/types` to the TypeScript source — tests resolve the live source without requiring a dist build step in CI.
- Wrote `backend/tests/pipeline/types.test.ts`: 10 tests across DEFAULT_CONFIG and SAFE_DEFAULT_PRIMARIES. All 10 pass.
- Added `reference/**` to ESLint ignore list (reference script uses `var`, `any`, and other pre-existing style issues we don't own).

**Decisions made:**

- Defined all output types (`PrimitiveTokenSet`, `SemanticTokenSet`, `ComponentTokenSet`, `GeneratedSystem`, etc.) in `output.ts` now rather than deferring to Tasks 0.4–0.6. Tasks 0.4–0.6 fill in implementations but the type shapes are stable. This avoids a round of imports breaking when types are added later.
- `GeneratedSystem` includes both intermediate objects (token sets, component specs) and the final `files[]` array. Doc generators and serializers can both access what they need from a single object.
- `SemanticColorValue` uses `{ light: string; dark?: string }` — dual-mode configs populate `dark`, single-mode configs leave it undefined. This is the clearest representation of the optional dark mode.
- `SAFE_DEFAULT_PRIMARIES` are Tailwind 500-level mid-range seed colors. The contrast validation against backgrounds will be asserted in Task 0.3 once `contrastRatio` exists, per the task file.

**What was not done:**
- No pipeline logic (color generation, token mapping, code generation) — as required.
- No new runtime packages beyond zod (which was already in the workspace).

**Verification:**
- `tsc` (emit) on `packages/types`: zero errors, 4 `.d.ts` files in `dist/`
- `tsc --noEmit` on `packages/types`: zero errors
- `tsc --noEmit` on `backend`: zero errors
- `eslint .`: zero errors
- `cd backend && npm test -- types`: 10/10 tests pass

---

## 2026-05-01 — Tasks 0.2 and 0.3: Color scale generation + WCAG contrast utilities

**What was done:**

- Implemented `backend/src/pipeline/palette/generator.ts`: `TARGET_CONTRASTS` (19-entry table, monotonically increasing 50→450 vs white, monotonically decreasing 500→950 vs black) and `generateColorScale(seedHex: string): ColorScale`. Builds a 1200-element candidate pool via HSV/HSL sweeps across the input hue, then for each shade picks the candidate whose contrast against the reference (`#ffffff` for 50–450, `#000000` for 500–950) is closest to `TARGET_CONTRASTS[shade]`.
- Wrote `backend/tests/pipeline/palette/generator.test.ts`: 25 tests. Covers TARGET_CONTRASTS structure (19 keys, monotonicity, range bounds), generateColorScale correctness (19 shades, valid hex output, monotonic contrast ordering, luminance bounds for shade 100/900, multi-hue seeds), shade 50/950 near-boundary checks, pure function assertion, gray seed, and cross-hue consistency at shades 100/300/500/700/900 within ±0.3 of target for blue/red/green/amber seeds. All 25 pass.
- Implemented `backend/src/pipeline/tokens/accessibility.ts`: `contrastRatio` (WCAG relative luminance formula), `meetsAA` (thresholds 4.5/3.0), `meetsAAA` (thresholds 7.0/4.5), `findAccessibleStep` (returns closest-passing hex from a ColorScale, throws if no step qualifies).
- Wrote `backend/tests/pipeline/tokens/accessibility.test.ts`: 21 tests. Covers contrastRatio (white/black = 21, symmetry, same-color = 1, pinned value for #3b82f6 vs white ≈ 3.67, range bounds, black/black), meetsAA (AA/AA-large thresholds), meetsAAA (AAA/AAA-large thresholds), findAccessibleStep (hex return, ratio qualifies, closest-passing, dark backgrounds, throws on no match, 3.0 large-text threshold). All 21 pass.
- Created directories `backend/tests/pipeline/palette/` and `backend/tests/pipeline/tokens/`.

**Decisions made:**

- Candidate pool built from four complementary sweeps (light/high-value, saturation sweep, dark/low-value, pure luminance gradient) at 300 steps each (1200 total). This gives uniform coverage from white to black while preserving hue, so every shade's target contrast is reachable regardless of input hue.
- Cross-hue consistency is achieved by construction: all hues search the same TARGET_CONTRASTS table against the same reference colors. The tolerance is ±0.3 which the pool density achieves for all tested hues.
- `findAccessibleStep` returns the minimum passing ratio (closest to floor from above) rather than the maximum — this matches "the darkest shade that still passes" semantics described in the task spec, giving callers the subtlest accessible color rather than the most accessible one.

**What was not done:**
- No token generation or mapping — as required.
- No imports from Task 0.2 in the accessibility module — utilities are standalone.

**Verification:**
- `tsc --noEmit` on `backend`: zero errors
- `eslint .`: zero errors
- `cd backend && npm test -- generator`: 25/25 pass
- `cd backend && npm test -- accessibility`: 21/21 pass

---

## 2026-05-01 — Task 0.4: Primitive token generation

**What was done:**

- Implemented `backend/src/pipeline/palette/personalities.ts`: lookup tables `DENSITY_BASE_PX` (compact=3, balanced=4, spacious=5), `PERSONALITY_RADII` (four personalities × four named radius steps), `DIMENSIONALITY_SHADOWS` (flat/subtle/dimensional × three shadow steps), `NEUTRAL_SEEDS` (hex seeds for gray/slate/zinc/stone/warm-gray neutral families).
- Implemented `backend/src/pipeline/tokens/primitives.ts`: `generatePrimitives(config: ProjectConfig): PrimitiveTokenSet`. Calls `generateColorScale` for primary, neutral, and optionally secondary/accent. Spacing scale = basePx × N for SPACING_STEPS [1..48]. Type scale = 7 steps (text-xs…text-3xl) at `scaleRatio^(index−2)` so text-base is always 1rem. Radii and shadows looked up from personality/dimensionality tables.
- Wrote `backend/tests/pipeline/tokens/primitives.test.ts`: 29 tests. Covers structure (all fields present), colors (exact key set for primary-only vs with secondary/accent, 19-shade keys, valid hex values), spacing (all three density variants for space-2, range check), typeSizes (7-step count, text-base=1rem, text-lg for both 1.25 and 1.333 ratios, size ordering), radii (professional vs approachable differ, all four keys present, radius-full=9999px for all personalities), shadows (flat=none, subtle/dimensional=non-none), and mode-agnosticism (light-only vs light+dark deep-equal). All 29 pass.

**Decisions made:**

- `PrimitiveTokenSet` was already defined in `output.ts` from Task 0.1; no type changes needed.
- Spacing steps are [1,2,3,4,5,6,8,10,12,14,16,20,24,32,40,48] — a geometric-ish progression that covers most UI layout needs without generating an unwieldy number of tokens.
- Type size formatting uses `parseFloat(value.toFixed(3))` to produce clean strings like '1rem', '1.25rem', '1.333rem' — strips trailing zeros, avoids floating-point noise.
- Neutral family seeds are Tailwind 500-level equivalents, which ensures the neutral scale visually matches the named family while going through the same contrast-calibrated generator as chromatic hues.

**What was not done:**
- No semantic token mapping — as required.
- No WCAG validation on primitives — as required.

**Verification:**
- `tsc --noEmit` on `backend`: zero errors
- `eslint .`: zero errors
- `cd backend && npm test -- primitives`: 29/29 pass

---

## 2026-05-01 — Task 0.5: Semantic token generation

**What was done:**

- Implemented `backend/src/pipeline/tokens/semantic.ts`: `generateSemanticTokens(primitives, config): SemanticTokenSet`. Generates fixed scales for red/green/amber/blue at module load (one-time cost, reused for feedback/destructive tokens). Resolves all 22 color semantic tokens per mode from the spec's shade assignments (`primary.600`/`.400` for light/dark, neutral shades for surfaces, text, borders). Runs WCAG AA correction on 6 foreground/background text pairs (4.5:1 threshold). Extends the 7-step primitive type scale with `font.size.4xl` and `font.size.5xl` by continuing the ratio. Maps component and layout spacing, radius, and shadow tokens from primitives.
- Wrote `backend/tests/pipeline/tokens/semantic.test.ts`: 21 tests. Covers all 22 required color keys present, all typography keys present (font.family ×4, font.size xs–5xl, font.weight ×4, font.line-height ×3), spacing/radii/shadows present, WCAG AA enforcement for DEFAULT_CONFIG (all text pairs ≥4.5:1, zero corrections), auto-correction with `primaryHex: '#a8c5f5'` + dual mode (corrections non-empty, corrected output passes AA), and single vs dual mode (dark absent for light-only, present for dual, surface/text dark≠light). All 21 pass.

**Decisions made:**

- Fixed-hue scales (red/green/amber/blue) for feedback and destructive tokens are computed once at module load, not per `generateSemanticTokens` call. They're deterministic pure functions so this is safe and avoids re-generating ~1200-candidate pools on each invocation.
- Auto-correction searches the neutral scale for a replacement foreground. `findAccessibleStep` returns the minimum-passing step (closest to threshold from above), matching the spec's "nearest passing step" language.
- Dark mode text.secondary (neutral.400) on surface.default (neutral.950) reliably falls below 4.5:1 — this is the structural failure that the `#a8c5f5` + dual-mode correction test exercises.
- `font.size.4xl` and `font.size.5xl` are generated in the semantic layer (not primitives) since Task 0.4 spec requires exactly 7 primitive size steps.

**What was not done:**
- No component token assignments — Task 0.6.
- No component code or documentation generation.

**Verification:**
- `tsc --noEmit` on `backend`: zero errors
- `eslint .`: zero errors
- Full suite: 106/106 pass (5 test files)

---

## 2026-05-01 — Task 0.6: Component token generation

**What was done:**

- Implemented `backend/src/pipeline/tokens/component.ts`: `generateComponentTokens(semantic, config): ComponentTokenSet`. Returns a static mapping of 17 components (12 Tier 1 + 5 Tier 2). Every token value is a semantic token name (e.g. `space.component.sm`, `radius.md`, `color.border.action`) — no primitive names or raw px values. `semantic` and `config` params are in the signature for the interface contract; suppressed with `void` since the current mapping is config-independent (semantic resolution happens downstream).
- Wrote `backend/tests/pipeline/tokens/component.test.ts`: 15 tests. Covers Tier 1 and Tier 2 presence, non-empty token entries, required button tokens (padding.sm/md/lg, border-radius), required input tokens (padding, border-radius, border-color, border-color.focus), semantic reference enforcement (no `space-` prefix, no bare `/^\d+px$/`), compact < spacious resolved spacing for button.padding.md (resolves through semantic layer), and professional vs approachable resolved radius for button.border-radius. All 15 pass.

**Decisions made:**

- Component tokens are static semantic name references, not resolved values. The semantic layer is the resolution point; component tokens are a stable indirection layer that names which semantic token applies to which part of a component. This is the correct pattern per the spec and avoids coupling component tokens to specific px values.
- The "compact < spacious" test resolves through `semantic.spacing` by splitting the compound value `"space.component.sm space.component.md"` and summing the parsed px values. This correctly tests the full pipeline without requiring component tokens to embed resolved values.
- `void semantic; void config` inside the function body is the ESLint-safe way to keep interface params that aren't yet used by the static mapping.

**What was not done:**
- No component source code (.tsx) generation — Task 0.7.
- No primitive token references in component token values.

**Verification:**
- `tsc --noEmit` on `backend`: zero errors
- `eslint .`: zero errors
- Full suite: 121/121 pass (6 test files)

---

## 2026-05-01 — Task 0.7: Component code generation

**What was done:**

- Implemented `backend/src/pipeline/components/index.ts`: `generateComponents(config, tokens)` with a `COMPONENT_CATEGORY` map and scope filtering via `new Set(config.componentScope)`.
- One generator per component (17 total). Tier 1 (12): `button`, `input`, `select`, `checkbox`, `radio`, `switch`, `dialog`, `tooltip`, `popover`, `tabs`, `menu`, `slider`. Tier 2 (5): `form-field`, `card`, `badge`, `alert`, `avatar`.
- Every generator returns `GeneratedFile[]` — a `.tsx` component and a `.types.ts` re-export file.
- All interactive components wrap `@base-ui-components/react` primitives (Button, Input, Checkbox, Radio, Switch, Dialog, Tooltip, Popover, Tabs, Menu, Slider, Field).
- Button uses `cva` v1 API (`{ base, variants, defaultVariants }` single config object), four variants (primary/secondary/ghost/destructive), three sizes (sm/md/lg), focus-visible ring, CVA `VariantProps`.
- CSS custom properties reference component tokens (`--button-padding-sm`, `--color-action-primary`, etc.) — no primitive token names in generated output.
- Tier 2 structural components (Card, Badge, Alert, Avatar) use plain HTML elements — no Base UI primitive needed.
- `utils.ts` with `cn()` helper is always included in output.
- Wrote `backend/tests/pipeline/components/codegen.test.ts` (14 tests): completeness (all Tier 1 + Tier 2 present), Button content (variants, sizes, focus-visible, no primitives), Base UI imports (interactive components only), content quality (no TODO/FIXME/placeholder/console.log), scope filtering (forms/overlays/navigation exclusions).
- Wrote `backend/tests/pipeline/output/components.test.ts` (3 tests): writes generated files to `tests/_gen_output/`, runs workspace `tsc --noEmit` via `execSync`, asserts exit code 0. Added `tests/_gen_output/` to `.gitignore`.

**Decisions made:**

- `cva` v1.0.0-beta.4 takes a single config object — `cva({ base, variants, defaultVariants })` — not the two-argument form from v0.x. Updated Button generator accordingly.
- `ButtonProps` extends `ButtonHTMLAttributes<HTMLButtonElement>` (not `ComponentPropsWithoutRef<typeof BaseButton>`). The Base UI `ButtonProps` export is a discriminated union (`ButtonNativeProps | ButtonNonNativeProps`), which TypeScript does not allow interface extension from.
- Components with a `className` prop that wraps a Base UI primitive use `Omit<ComponentPropsWithoutRef<...>, 'className'> & { className?: string }` to override the Base UI function-typed `className` (which accepts `string | ((state) => string)`). This lets the generated `cn()` calls type-check correctly.
- Tier 2 components (Card, Badge, Alert, Avatar) are pure HTML — the Base UI import check in the test is scoped to interactive components only.

**What was not done:**
- No documentation files — Task 0.8.
- No token serialization — Task 0.9.

**Verification:**
- `tsc --noEmit` on `backend`: zero errors
- `eslint src`: zero errors
- Full suite: 138/138 pass (8 test files)
- TypeScript compilation of generated output: zero errors (tsc 0 exit)

---

## 2026-05-01 — Task 0.8: Documentation generation

**What was done:**

- Implemented `backend/src/pipeline/docs/component-specs.ts`: `buildComponentSpecs(config)` returns `ComponentSpec[]` filtered by `config.componentScope`. Contains static spec data for all 17 components (name, importPath, baseUIComponent, variants, sizes, tokenRefs, accessibilityNotes, usageGuidance).
- Implemented `backend/src/pipeline/docs/readme.ts`: `generateReadme(system, config)`. Six required sections: What Was Generated, Installation, Token Usage, Dark Mode, Component Usage, How to Regenerate. Content is config-aware (light-only vs dark mode detection, component list, token count).
- Implemented `backend/src/pipeline/docs/tokens-doc.ts`: `generateTokensDoc(system)`. Generates markdown tables for all five semantic token categories (colors, typography, spacing, radii, shadows). Every token row includes the token name, CSS custom property, and resolved value. Includes a corrections section when WCAG auto-corrections were applied.
- Implemented `backend/src/pipeline/docs/components-doc.ts`: `generateComponentsDoc(system, config)`. One section per component, grouped by category (Forms, Overlays, Navigation, Feedback, Data Display). Each section includes usage guidance, variants/sizes, token refs, accessibility notes, and an import example.
- Implemented `backend/src/pipeline/docs/decisions.ts`: `generateDecisions(config)`. Five sections: type scale, border radius, color approach, spacing density, shadow depth. Each section contains config-specific rationale derived from `typeStyle`, `personality`, `density`, `dimensionality`, and `colorDirection` lookup tables. Output is guaranteed to differ between any two configs that differ on these axes.
- Implemented `backend/src/pipeline/docs/agent-spec.ts`: `generateAgentSpec(system, config)`. Produces valid JSON with all required keys: `version`, `projectId`, `projectName`, `generatedAt`, `config`, `tokens`, `components`, `rules`. Project ID is derived from `primaryHex` and `projectType`. Rules array encodes usage constraints that AI coding assistants should follow.
- Wrote `backend/tests/pipeline/docs/docs.test.ts`: 13 tests. All pass on first run.

**Decisions made:**

- `buildComponentSpecs` lives in `docs/component-specs.ts` rather than `components/` because it produces `ComponentSpec[]` which is doc/pipeline metadata, not generated output. The pipeline entry point (Task 0.10) will call it when assembling `GeneratedSystem.components`.
- `generateComponentsDoc` derives categories from component import paths rather than a separate map. This avoids a second source-of-truth for category membership.
- `generateDecisions` uses lookup tables keyed by `TypeStyle`, `Personality`, `Density`, `Dimensionality` — each entry is a distinct paragraph. This guarantees the required diff between `serif-accented` and `geometric` configs.
- `agent-spec.json` includes a `rules` array (string list) rather than a complex structured type, since the primary consumer is an AI coding assistant that reads plain natural language constraints.

**What was not done:**
- No export serialization (W3C JSON, CSS, Tailwind) — Task 0.9.
- No pipeline entry point — Task 0.10.

**Verification:**
- `tsc --noEmit` on `backend`: zero errors
- `eslint src`: zero errors
- Full suite: 151/151 pass (9 test files)

---

## 2026-05-01 — Task 0.9: Export serialization

**What was done:**

- Implemented `backend/src/pipeline/export/w3c.ts`: `serializeToW3C(tokenSet: TokenSet): string`. Recursively traverses any `Record<string, unknown>` and produces nested W3C DTCG JSON. Splits dot-separated keys into nested groups. Leaf strings with hex/px/rem/em values get `$type: "color"/"dimension"`. String values matching the token path pattern (`word.word.word`) get wrapped as `{path}` alias references. `SemanticColorValue` objects (`{ light, dark? }`) get `$value: lightHex` plus `$extensions.mode-dark` for dark variants.
- Implemented `backend/src/pipeline/export/css.ts`: `serializeToCSS(semantic, component, modes)`. Generates `:root {}` with all semantic tokens (light-mode colors, typography, spacing, radii, shadows) and component tokens (as `var()` references to their semantic counterparts). Adds `[data-theme="dark"] {}` block only when `modes.includes('dark')`, containing only the overriding color values.
- Implemented `backend/src/pipeline/export/tailwind.ts`: `serializeToTailwind(semantic)`. Outputs a valid TypeScript module starting with `import type { Config } from 'tailwindcss'`. Maps all semantic token categories to `theme.extend` (colors, fontFamily, fontSize, fontWeight, spacing, borderRadius, boxShadow), with each value as a CSS `var()` reference. Verified to compile against Tailwind CSS v4.
- Implemented `backend/src/pipeline/export/zip.ts`: `assembleZip(files: GeneratedFile[]): Promise<Buffer>`. Uses `jszip` to package all `GeneratedFile` entries into a DEFLATE-compressed ZIP buffer. Never writes to the filesystem.
- Wrote `backend/tests/pipeline/export/serializers.test.ts`: 20 tests covering W3C (valid JSON, nested leaf `$value`/`$type`, alias reference syntax), CSS (`:root` block, `--color-action-primary`, no dark block for light-only, dark block with different values for dual-mode), Tailwind (module starts correctly, contains var() refs, ends with `export default config`), ZIP (Buffer returned, all 12 expected paths present, re-parseable by jszip, content preserved).
- Wrote `backend/tests/pipeline/output/tailwind.test.ts`: 2 tests. Writes the serialized Tailwind config to `tests/_gen_tailwind/`, runs workspace `tsc --noEmit`, asserts exit code 0.
- Added `tests/_gen_tailwind/` to `.gitignore`.

**Decisions made:**

- W3C alias detection uses the regex `/^[a-z][\w-]*(\.[a-z][\w-]+)+$/`. This matches component token values like `'color.action.primary'`, `'space.component.sm'`, `'radius.md'` but not CSS values like `'4px'`, `'#3b82f6'`, or multi-word strings like `'Inter, sans-serif'`. False positives are acceptable here since the component token values are consistently in this form.
- `SemanticColorValue` objects in the semantic color set are handled as a special case in `buildDTCG` — detected by checking for a `light` property on nested objects. This avoids trying to recurse into `{ light: '#...', dark: '#...' }` as if it were a token group.
- `serializeToCSS` emits component token values as `var(--semantic-token)` when the value matches the alias pattern. This means the CSS file correctly chains variables: `--button-background: var(--color-action-primary)`.
- Tailwind config uses `skipLibCheck: true` in the compilation test tsconfig to avoid issues with Tailwind v4's `.d.mts` export files. The Config type still type-checks the theme structure correctly.

**What was not done:**
- No pipeline entry point — Task 0.10.

**Verification:**
- `tsc --noEmit` on `backend`: zero errors
- `eslint src`: zero errors
- Full suite: 173/173 pass (11 test files)
- Tailwind config TypeScript compilation: zero errors (tsc 0 exit)

---

## 2026-05-02 — Task 0.10: Full pipeline integration

**What was done:**

- Implemented `backend/src/pipeline/index.ts`: `generate(config: ProjectConfig): GeneratedSystem`. Calls all sub-generators in order (primitives → semantic → component → components → docs → serializers), assembles 12+ output files, and returns the complete `GeneratedSystem`.
- `generate()` produces: `tokens/primitives.json`, `tokens/semantic.json`, `tokens/component.json` (all W3C DTCG), `tokens/variables.css` (CSS custom properties), `tokens/tailwind.config.ts`, `components/index.ts` (barrel), all component `.tsx` and `.types.ts` files, `docs/README.md`, `docs/tokens.md`, `docs/components.md`, `docs/decisions.md`, `docs/agent-spec.json`, `.design-system-meta.json`.
- Barrel generator (`buildComponentIndex`) maps `ComponentSpec.name` to the correct re-export lines for all 17 components.
- Wrote `backend/tests/pipeline/integration.test.ts`: 28 tests. Covers output shape (required paths, W3C JSON parsing, CSS block, agent-spec structure, forbidden strings), WCAG contrast (light + dark mode pairs), performance (< 200ms for default + full config), determinism (vi.setSystemTime to pin timestamp), parameterized correctness (all 4 typeStyles, 3 densities, both colorSources), no-side-effects (console.log spy), and full TypeScript compilation of component files + Tailwind config from `generate()` output.

**Decisions made:**

- `generate()` uses `new Date().toISOString()` for `generatedAt`. This makes the output non-deterministic across real time boundaries, but the determinism test uses `vi.setSystemTime` to pin the clock — this is the correct pattern for testing time-dependent code without changing the production API.
- The integration test's "placeholder" check excludes `.json` files because `input.color.placeholder` is a legitimate component token key that appears in `tokens/component.json`. The check correctly targets only `.tsx`, `.ts`, and `.md` files.
- Barrel generator uses a static `BARREL_ENTRIES` map rather than parsing generated file content. This is simpler and correct given that the component generators are also static.
- Component barrel `components/index.ts` is generated before the component files in the `allFiles` array, so it appears first in the output — consistent with the spec's artifact listing.

**What was not done:**
- Phase retrospective (`docs/phase-0-retro.md`) — will be authored in a housekeeping session.
- `tasks/phase-1.md` — will be authored before Phase 1 begins.

**Verification:**
- `tsc --noEmit` on `packages/types`: zero errors
- `tsc --noEmit` on `backend`: zero errors
- `eslint src` on `backend`: zero errors
- Full suite: 201/201 pass (12 test files)
- `generate()` completes in < 200ms for DEFAULT_CONFIG and full config with dark mode
- Generated component TSX and Tailwind config both compile with tsc from within the integration test

---

*Phase 0 session entries will appear above as work begins. When Phase 0 is complete, entries will be archived to `logs/phase-0.md` and a pointer left here.*
