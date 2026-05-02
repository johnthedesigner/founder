# Phase 0 Retrospective — Pipeline Foundation

**Completed:** 2026-05-01
**Tests at close:** 201 passing / 0 failing (12 test files)
**TypeScript:** Zero errors in `packages/types` and `backend`
**ESLint:** Zero errors

---

## What was built

The full generation pipeline — a pure function `generate(config: ProjectConfig): GeneratedSystem` — implemented across 10 sequential tasks in a single session.

**Task 0.1 — Types and defaults:** All shared types in `packages/types`, Zod schema, `DEFAULT_CONFIG`, `SAFE_DEFAULT_PRIMARIES`. No pipeline logic — just the type contracts.

**Task 0.2 — Color scale generation:** `generateColorScale(seedHex)` using a contrast-targeting algorithm. Given any seed color, produces a 19-step scale (50–950) where each shade hits a fixed per-step contrast target against white (light shades) or black (dark shades). Cross-hue consistency guaranteed: any two hues produce the same relative lightness at the same shade number.

**Task 0.3 — WCAG utilities:** `contrastRatio`, `meetsAA`, `meetsAAA`, `findAccessibleStep`. The foundation of pipeline-level accessibility enforcement.

**Task 0.4 — Primitive token generation:** Full primitive token set from config: color scales (primary + neutral + optional secondary/accent), spacing steps (density-derived), type scale (7 steps, configurable ratio), radii (personality-derived), shadows (dimensionality-derived).

**Task 0.5 — Semantic token generation:** 22 semantic color tokens with WCAG AA enforcement and auto-correction. Dark mode pairs for all color tokens. Full typography, spacing, radii, and shadows at the semantic layer. Corrections recorded for upstream surfacing.

**Task 0.6 — Component token generation:** Per-component token mappings for all 17 components, referencing semantic token names (never primitive names). Correct indirection layer between semantic and generated component code.

**Task 0.7 — Component code generation:** 17 component generators producing TypeScript/TSX files. All interactive components wrap `@base-ui-components/react` primitives. Button uses cva v1 API with four variants and three sizes. Tier 2 structural components (Card, Badge, Alert, Avatar) use plain HTML. All generated code compiles with `tsc --noEmit` — verified in a separate output compilation test.

**Task 0.8 — Documentation generation:** Five doc generators: README, tokens reference, components reference, decisions rationale, and agent-spec JSON. Decision rationale is config-specific (output differs for different typeStyle/personality/density/dimensionality combinations). Agent spec includes a `rules` array for AI coding assistants.

**Task 0.9 — Export serialization:** W3C DTCG JSON serializer (nested with `$value`/`$type`, alias references), CSS custom property serializer (`:root` + optional `[data-theme="dark"]`), Tailwind config generator (valid TypeScript, verified by tsc), ZIP assembler using jszip.

**Task 0.10 — Integration:** `generate()` entry point wires all sub-generators. Comprehensive integration test: output shape, WCAG pairs, performance (<200ms), determinism, parameterized configs, no side effects, TypeScript compilation of generated output.

---

## Key decisions

**Types first, implementations later.** All `GeneratedSystem`, `SemanticTokenSet`, `ComponentSpec`, and related output types were defined in Task 0.1 alongside the config types. Later tasks filled in implementations without needing to change the type shapes. This avoided a round of import-breaking when types were introduced mid-phase.

**InterimSystem pattern.** Doc generators take `GeneratedSystem` as input, but docs are files in `GeneratedSystem.files`. Broken by building an `interimSystem` with `files: []`, passing it to all doc generators, then assembling all files into the final system. This breaks the circular dependency without adding complexity.

**Semantic-only component tokens.** All component token values are semantic token names (`color.action.primary`, `space.component.md`) — never primitive names or resolved px values. This is the correct indirection layer and is enforced by tests. The pipeline never exposes raw primitive tokens in generated component code.

**Pipeline-level accessibility enforcement.** WCAG AA correction runs in `semantic.ts` — not in UI. The pipeline cannot produce an inaccessible semantic color pairing. The UI can display contrast ratios but cannot influence them. This was a design principle from day one and held throughout.

**Fixed-hue scales at module load.** The semantic layer pre-generates feedback color scales (red/green/amber/blue) once at module load time rather than per `generate()` call. These are deterministic pure functions; caching them at load is safe and measurably faster.

**Static BARREL_ENTRIES in index.ts.** The `components/index.ts` barrel is built from a static map rather than parsing generated file content. Simpler and correct given that component generators are also static.

**Two tsconfigs for integration compilation tests.** Component TSX files need `jsx: react-jsx`; `tokens/tailwind.config.ts` does not. The integration test writes two separate tsconfig files to the output directory and runs tsc twice. This is the correct solution — not a workaround — because they genuinely have different compilation requirements.

---

## What was hard

**cva v1 API change.** cva v1.0.0-beta.4 changed from `cva(base, config)` to `cva({ base, ...config })`. The first attempt used the old API; TypeScript compilation of generated output caught it immediately. The fix was straightforward once identified.

**Base UI's discriminated union ButtonProps.** `@base-ui-components/react/button` exports `ButtonProps = ButtonNativeProps | ButtonNonNativeProps`. TypeScript does not allow `interface Foo extends SomeUnionType`. The fix was `extends ButtonHTMLAttributes<HTMLButtonElement>` — semantically equivalent for the generated code's purposes.

**Base UI function-typed className.** Base UI's className accepts `string | ((state: State) => string | undefined)`. Our `cn()` helper takes `ClassValue[]`. Solved with `Omit<ComponentPropsWithoutRef<...>, 'className'> & { className?: string }` in the generated types file — a known pattern for overriding problematic prop types in wrapper components.

**Component token `placeholder` string in JSON.** `input.color.placeholder` is a legitimate component token key that ends up as a JSON string in `tokens/component.json`. The integration test's "no placeholder strings" check had to exclude `.json` files (only applies to `.tsx`, `.ts`, `.md`).

**Determinism test.** `generate()` calls `new Date().toISOString()` internally. Two sequential calls produce different `generatedAt` timestamps, failing a byte-for-byte comparison. Solved with `vi.setSystemTime` to pin the clock for both calls in the determinism test. The production code is unchanged — no mock-friendly overrides, no injected clock.

---

## What worked well

**Test-driven by requirement.** Writing tests before or immediately alongside implementations caught real bugs on every task. The TypeScript compilation output test in Task 0.7 caught both the cva API issue and the Base UI className issue that would have been invisible without actually compiling the generated code.

**Parameterized test structure.** The integration test's parameterized correctness section (4 typeStyles × 3 densities × 2 colorSources) gives broad coverage for free. Parameterizing over enum values rather than writing individual test cases is the correct approach for combinatorial config testing.

**Intermediate objects retained.** Keeping `PrimitiveTokenSet`, `SemanticTokenSet`, and `ComponentTokenSet` as structured objects throughout (rather than immediately serializing) made it easy for doc generators, serializers, and WCAG validation to each access exactly what they need. Serialization only happens at the edge (Task 0.9).

**CSS variable chaining.** The CSS serializer emits component tokens as `var(--semantic-token)` references, not resolved values. This means `--button-background: var(--color-action-primary)` — the chain is correct and dark mode just needs to override `--color-action-primary` at the `[data-theme="dark"]` layer.

---

## Open issues at phase close

None. All acceptance criteria are met. The pipeline is production-ready as a pure function. Phase 1 will wire it to real API routes.
