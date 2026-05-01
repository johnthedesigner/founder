# Design System Generator — Product Specification

**Version:** 1.0
**Status:** Approved for development
**Purpose:** Comprehensive functional specification for AI-assisted development. This document is the single source of truth for product behavior, data model, and UI interaction. It should be provided as context for every development session.

---

## Glossary

| Term | Definition |
|---|---|
| **Project** | A saved design system configuration belonging to a user. Produces a deterministic set of output artifacts when exported. |
| **ProjectConfig** | The complete configuration object stored per project. Every output artifact is derived from this object — nothing else is persisted. |
| **Generation pipeline** | The server-side pure function `generate(config: ProjectConfig): GeneratedSystem` that produces all output artifacts. |
| **GeneratedSystem** | The in-memory output of the generation pipeline: token sets, component source files, and documentation strings. |
| **Primitive tokens** | Raw named values: color scales, type size steps, spacing steps, radius steps, shadow definitions. Never applied to components directly. |
| **Semantic tokens** | Role-mapped aliases that reference primitive tokens: `color.action.primary → color.blue.600`. These are what component code uses. |
| **Component tokens** | Component-specific semantic aliases: `button.padding.md`, `input.border-radius`. Reference semantic tokens. |
| **System Preview** | A live iframe sandbox rendering actual generated component code against the current token values. Updates within 500ms of any config change. |
| **Scope** | Which component categories are included in a given project. Determined by project type selection and optionally customized. |
| **Personality axes** | The four high-level style questions (Density, Personality, Type Style, Dimensionality) from which default values for the full token system are derived. |
| **Stage** | One of four sequential sections of the creation flow: Foundation, Style, Tokens & Components, Export. |
| **Agent spec** | The `agent-spec.json` file included in every export, also served live via the agent API. A machine-readable description of the full design system for use by coding agents. |
| **CLI** | The `npx` command that pulls the latest export from the platform and writes files into a user's codebase. The CLI contains no generation logic — that lives entirely on the platform. |

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Core Design Principles](#2-core-design-principles)
3. [Output Artifacts](#3-output-artifacts)
4. [The Creation Flow](#4-the-creation-flow)
5. [The System Preview](#5-the-system-preview)
6. [Token System](#6-token-system)
7. [Component System](#7-component-system)
8. [Documentation Generation](#8-documentation-generation)
9. [Agent API](#9-agent-api)
10. [CLI Tool](#10-cli-tool)
11. [Figma Integration](#11-figma-integration)
12. [Accounts and Projects](#12-accounts-and-projects)
13. [Home Page](#13-home-page)
14. [Accessibility](#14-accessibility)
15. [Out of Scope — V1](#15-out-of-scope--v1)

---

## 1. Product Overview

### Purpose and Positioning

Design System Generator is a guided tool for creating a complete, deployment-ready design system for a web product. It replaces the weeks of manual setup typically required to establish a token system, component library, and design documentation with a structured, opinionated flow that produces production-quality output in a single session.

The tool is designed for individual developers and small teams who are starting a new product or formalizing an existing one. A user with a React/Tailwind project and some sense of their desired visual character can complete the flow and have a working design system — tokens, component code, Figma variables, and agent-ready documentation — ready to integrate.

The primary output is a portable artifact package. The tool does not require ongoing use after the initial creation; the output lives in the user's codebase and Figma workspace. Users who save a project can return to adjust their system and re-export at any time.

### What the Tool Is Not

It is not a design tool (that is Figma). It is not a component library (that is Base UI). It is not a continuous design system management platform (that may be a future product). It is the structured decision-making process that produces a coherent, documented, deployable system from a set of inputs.

### V1 Scope Summary

V1 is a fast-start generator, not a design system management platform. The goal is to get a user from zero to a complete, integrated design system as quickly as possible, with zero ongoing platform dependency after export.

---

## 2. Core Design Principles

These principles govern every product decision. If a proposed feature or behavior conflicts with one of these, the principle wins.

**Time-to-preview is a hard constraint, not a feature.** Every input the user commits to must produce a visible change in the System Preview within 500ms. The preview is never a "generate" step — it is always live. The generation pipeline must be structured so partial inputs produce a valid preview state at all times.

**Be opinionated about structure, flexible about values.** The tool always produces the same shape of output — a three-layer token system, a curated component set, full documentation, an agent spec. The values within that shape are configurable. This prevents the experience from becoming a blank canvas while accommodating diverse inputs.

**Defaults are the product.** Most users will accept most defaults. Every default must be defensible: a specific typeface pairing, a specific radius scale, a specific shadow system. The defaults for the SaaS/Professional/Balanced/Subtle personality combination must produce something that looks genuinely good, not just acceptable.

**The output must be immediately usable.** Every generated file must be production-ready as-is. No placeholders, no TODOs, no "replace this value." A developer should be able to drop the output into a project and have it work.

**Accessibility is non-negotiable.** Every color combination produced by the generator must meet WCAG AA contrast requirements. Every generated component must be accessible. The generator must not be capable of producing an inaccessible design system through any combination of user inputs.

**The complexity lives on the platform, not in the output.** The generated files should be simple to read, understand, and edit. The intelligence is in the generation; the output should feel like something a skilled engineer wrote by hand.

---

## 3. Output Artifacts

Every generated project produces this exact file tree when exported. Files are also individually accessible via the agent API.

```
{project-slug}/
├── tokens/
│   ├── primitives.json          # W3C DTCG format. Raw scales: color steps (50–950
│   │                            # per hue), type sizes, spacing steps, radii, shadows.
│   ├── semantic.json            # W3C DTCG format. Role-mapped aliases referencing
│   │                            # primitives: color.action.primary → color.blue.600.
│   ├── component.json           # W3C DTCG format. Component-specific aliases:
│   │                            # button.padding.md, input.border-radius.
│   ├── variables.css            # Flat CSS custom properties. :root { } for light mode.
│   │                            # [data-theme="dark"] { } for dark mode (if enabled).
│   │                            # All three token layers flattened into one file.
│   └── tailwind.config.ts       # Extends Tailwind theme with all semantic and component
│                                # tokens. Primitive scales available as arbitrary values.
│
├── components/
│   ├── index.ts                 # Barrel export of all generated components.
│   ├── button/
│   │   ├── button.tsx           # Styled Base UI Button wrapper. All variants and sizes.
│   │   └── button.types.ts      # Props interface. Exported separately for downstream use.
│   ├── input/
│   ├── select/
│   ├── checkbox/
│   ├── radio/
│   ├── switch/
│   ├── dialog/
│   ├── tooltip/
│   ├── popover/
│   ├── tabs/
│   ├── menu/
│   ├── slider/
│   ├── form-field/              # Tier 2: label + input + hint text + error message.
│   ├── card/                    # Tier 2: header + body + footer zones.
│   ├── badge/                   # Tier 2: status and label variants.
│   ├── alert/                   # Tier 2: informational, warning, error, success variants.
│   └── avatar/                  # Tier 2: image + initials fallback.
│   # Only components in the selected scope categories are generated.
│
├── docs/
│   ├── README.md                # Overview: what was generated, how to install,
│   │                            # how to use tokens in code, how to extend.
│   ├── tokens.md                # Token reference: every token, its resolved value,
│   │                            # its semantic role, and usage guidance. Both modes
│   │                            # shown side by side if dark mode is enabled.
│   ├── components.md            # Component reference: props table, variant list,
│   │                            # usage examples, accessibility notes per component.
│   ├── decisions.md             # Design rationale: rule-based explanation of why
│   │                            # each major decision (type scale, radius, color
│   │                            # approach) is appropriate for the stated project type
│   │                            # and personality. Generated deterministically, no LLM.
│   └── agent-spec.json          # Machine-readable system spec. See Section 9.
│
└── .design-system-meta.json     # Internal manifest: project ID, project slug, generation
                                 # timestamp, full ProjectConfig snapshot. Used by the CLI
                                 # to identify the project and sync updates.
```

### Component Tiers

**Tier 1 — Base UI wrappers.** Button, Input, Select, Checkbox, Radio, Switch, Dialog, Tooltip, Popover, Tabs, Menu, Slider. Thin styled wrappers around the corresponding Base UI component. The wrapper applies token-based Tailwind classes and opinionated prop defaults. Behavior is entirely Base UI's.

**Tier 2 — Composed components.** Form Field, Card, Badge, Alert, Avatar. Assemblies of Tier 1 components and HTML elements. No Tier 3 (page-level patterns) are generated in V1 or planned.

### Token Format

All three JSON files use the W3C Design Token Community Group (DTCG) format. This format is directly importable into Figma via Tokens Studio and will be natively importable via Figma's built-in variables import when that ships. It is also the input format for Style Dictionary, enabling downstream transformation to any platform format.

---

## 4. The Creation Flow

The flow has four stages. The user can navigate back to any earlier stage at any time to adjust their choices — the System Preview updates immediately on any change.

A user who arrives without an account completes the full flow and can download the export package. Account creation is prompted at export time as a soft gate to save and revisit the project. It is never required to complete the flow or download.

### Default State

When the creation flow loads for the first time (no prior session, no saved project), it pre-selects the following defaults so the System Preview can render immediately:

- **Project type:** SaaS / Web App
- **Scope:** All six component categories included
- **Primary color:** A randomly selected saturated hue from a curated set of eight "safe" starting colors (blue, indigo, violet, emerald, amber, rose, cyan, orange — all calibrated to pass WCAG AA against both white and near-black backgrounds)
- **Neutral family:** Cool gray
- **Personality:** Professional
- **Density:** Balanced
- **Type Style:** Geometric
- **Dimensionality:** Subtle
- **Mode:** Light only

These defaults produce a coherent SaaS-appropriate starting point. The System Preview shows this system before the user has made any explicit choice.

---

### Stage 1 — Foundation

Stage 1 collects the minimum information needed to establish project scope and color direction. The System Preview is visible throughout Stage 1, reflecting the current defaults and updating as the user makes choices.

#### Step 1.1 — Project Type

A row of three visual selection cards. One card is pre-selected (SaaS / Web App). Cards show an icon, a label, and a one-line description.

| Option | Description |
|---|---|
| SaaS / Web App | Dashboard, tools, and data-heavy interfaces |
| Marketing Site | Landing pages, content sites, documentation |
| Mobile Web | Touch-first, constrained viewport |

Selecting a card immediately updates the scope summary below and the System Preview.

Below the cards, a scope summary is shown as a row of labeled chips: one chip per included component category (Forms, Navigation, Overlays, Feedback, Data Display, Layout). The chips reflect the defaults for the selected project type. A "Customize" link below the chips reveals a checklist allowing individual categories to be toggled. The checklist is collapsed by default; most users do not need it.

**Scope defaults by project type:**

| Category | SaaS / Web App | Marketing Site | Mobile Web |
|---|---|---|---|
| Forms | ✓ | ✓ | ✓ |
| Navigation | ✓ | ✓ | ✓ |
| Overlays | ✓ | — | — |
| Feedback | ✓ | ✓ | ✓ |
| Data Display | ✓ | — | — |
| Layout | ✓ | ✓ | ✓ |

#### Step 1.2 — Existing Brand Assets?

A two-option toggle: "Starting fresh" or "I have brand assets."

**Starting fresh:** Proceed directly to Step 1.3 (color direction).

**I have brand assets:** Reveal a compact input area:
- Primary color: hex input + color picker. Required.
- Secondary / accent color: hex input + color picker. Optional.
- Typeface: text input (Google Fonts name) + "I'll upload a custom font" option. Optional.

Provided colors are immediately validated for WCAG AA contrast against the default background. If a provided color fails, an inline warning is shown with a suggested accessible alternative; the user can accept the suggestion or keep their original (with a persistent accessibility warning badge in the System Preview).

If a typeface name is provided and recognized in Google Fonts, it is loaded in the preview immediately.

#### Step 1.3 — Color Direction (starting fresh only)

Five visual options shown as color swatch cards:

| Option | Character |
|---|---|
| Cool & Professional | Blue-to-indigo primary, cool gray neutrals |
| Warm & Approachable | Amber-to-orange primary, warm gray neutrals |
| Bold & High-Contrast | High-saturation primary, pure black/white neutrals |
| Neutral & Minimal | Desaturated primary, stone or zinc neutrals |
| Earth Tones | Brown-adjacent primary, warm stone neutrals |

Each card shows a small representative palette strip — primary swatches + neutrals. Selecting one immediately updates the System Preview with the corresponding palette.

#### Step 1.4 — Light Mode, Dark Mode, or Both?

A three-option selection:
- Light only
- Dark only
- Both (full dual-mode token system)

"Both" is the default for SaaS / Web App. "Light only" is the default for Marketing Site and Mobile Web.

This choice determines whether semantic tokens get dual-mode values and whether the System Preview includes a mode toggle.

---

### Stage 2 — Style

Stage 2 presents four personality axes as visual choice cards. Each axis maps to a bundle of token defaults: selecting a combination of options determines the full token system values for typography, spacing, radius, and shadows. Deeper manual controls are available below each axis via a "Customize" disclosure.

The System Preview is prominent throughout Stage 2, updating within 500ms of any change.

#### The Four Axes

**Density** — Controls base spacing unit and component padding defaults.

| Option | Base unit | Character |
|---|---|---|
| Compact | 3px | Dense data interfaces, tight layouts |
| Balanced | 4px | General-purpose (default) |
| Spacious | 5px | Content-heavy, generous whitespace |

**Personality** — Controls primary color saturation behavior, component border treatment, and overall visual assertiveness.

| Option | Character |
|---|---|
| Professional | Muted saturation, clear hierarchy, subdued interactive states |
| Approachable | Moderate saturation, rounded edges, friendly interactive feedback |
| Bold | Full saturation, strong contrast, prominent interactive states |
| Minimal | Near-neutral primary, maximum whitespace, quiet components |

**Type Style** — Determines the font pairing used for display/headings and body/UI text, and the type scale ratio.

| Option | Pairing | Scale ratio |
|---|---|---|
| Geometric | Inter + Inter (single family) | 1.25 |
| Humanist | Plus Jakarta Sans + Inter | 1.25 |
| Serif-accented | Fraunces + Inter | 1.2 |
| Monospace-accented | Inter + JetBrains Mono (code emphasis) | 1.333 |

Each option is shown rendered at scale in the selection card so the user sees the actual typefaces, not just names.

**Dimensionality** — Controls the shadow scale and component border presence.

| Option | Shadow | Borders |
|---|---|---|
| Flat | None | 1px borders define all surfaces |
| Subtle | Soft diffuse shadows (default) | Light borders + shadows |
| Dimensional | Pronounced shadows, layered depth | Borders optional |

#### Deeper Customization

Each axis has a "Customize" disclosure that reveals fine-grained controls:

- **Density:** Edit the base spacing unit (1–8px), preview the full derived scale.
- **Personality:** Edit individual primitive color swatches, rename hue families, add or remove shades.
- **Type Style:** Choose any Google Fonts typeface, set the exact scale ratio, assign faces to roles (display, body, UI, code).
- **Dimensionality:** Edit individual shadow definitions, toggle borders on/off per component category.

These disclosures are collapsed by default. The system is fully usable without opening them.

---

### Stage 3 — Review

Stage 3 is the full System Preview with a structured review of the generated token summary. No new questions are asked here.

#### Step 3.1 — System Preview (full view)

The System Preview expands to fill the primary content area. It shows:

- **Color palette:** All primitive color scales as swatch rows (50–950 per hue), labeled with token names. Semantic color assignments shown below (which primitive maps to which role).
- **Type scale:** Each step rendered at its actual size, labeled with token name and computed px value.
- **Component strip:** Button (all variants and sizes), Form Field (with label, input, hint, error), Badge (all variants), Card, Alert.
- **Spacing + radius scales:** Visual swatches with token names and px values.

If dual-mode is enabled, a toggle in the preview header switches between light and dark. Both modes are valid and accessible.

Accessibility contrast ratios are shown as inline badges on every semantic color pairing. All pairings must show WCAG AA (4.5:1 for text, 3:1 for large text and UI components). Any failing pairing is shown with a warning badge and a suggested fix.

#### Step 3.2 — Token Summary

Below the System Preview, a collapsible token tree shows all generated tokens organized by layer (primitives → semantic → component). Values are shown as color swatches or formatted values, not raw JSON. A "View raw JSON" toggle reveals the full W3C DTCG output for each layer.

#### Step 3.3 — Project Name

A text input for naming the project. Default: "My Design System." Positioned here rather than at the start to reduce upfront friction.

---

### Stage 4 — Export

Three export paths presented as prominent CTAs:

**Download package:** Generates the full file tree described in Section 3 and triggers a ZIP download. Works for anonymous users. No account required.

**Use the CLI:** Shows the CLI command for the current project:
```
npx @ds-gen/cli init --project=<project-id>
```
If the user is anonymous, prompts them to create an account first (the CLI requires a project ID that is only generated for saved projects).

**Figma setup:** Opens a step-by-step guide for importing the generated `semantic.json` token file into the Base UI v0.1 community Figma file using Tokens Studio. The guide includes: link to the Base UI community file, link to the Tokens Studio plugin, and step-by-step screenshots.

**Account prompt (anonymous users only):** A soft-gate message below the CTAs: "Create a free account to save this project and update it any time." Two buttons: "Save my project" (creates account) and "Just download" (proceeds without saving). Dismissing this prompt never blocks the download.

---

## 5. The System Preview

The System Preview is an iframe sandbox running a Vite-built micro-application. It receives the current `ProjectConfig` (or a partial config during the creation flow) via `postMessage` and re-renders within 500ms of any message.

### Architecture

The preview sandbox is a separate build artifact deployed alongside the main application. It imports Base UI components directly and applies styles via CSS custom properties derived from the current config. Component code shown in the preview is the actual generated output — the preview is a validation that the generation pipeline produces working code, not a mockup.

The sandbox exposes no routes and accepts no user interaction other than the mode toggle (light/dark). It is read-only.

### Default State

When the config is partially filled (Stage 1 in progress), the preview renders with defaults for any unset values. It never shows an empty or broken state. Unset values use the system defaults described in Section 4.

### Preview Contents

The System Preview always shows:
- The current primary color palette (primitive scale + semantic assignments)
- The type scale rendered at each step
- A representative component strip (Button, Form Field, Badge, Card)
- Spacing and radius swatches

As the user progresses through the flow, the preview fills in with more specificity. By Stage 3 it is showing the full generated system.

---

## 6. Token System

The token system has three layers. All three are generated together from the `ProjectConfig`. They are interdependent — component tokens reference semantic tokens, which reference primitives.

### Layer 1 — Primitives

Raw named values. Never referenced directly in component code.

**Color primitives:** For each hue family in the project (primary, optional secondary, optional accent, neutral), a 19-step scale is generated from shade 50 to shade 950 in increments of 50. The scale is named to overlap with the familiar Tailwind color space, making the output immediately legible to developers and directly substitutable for Tailwind's built-in palettes.

The defining property of the generated scales is **cross-hue contrast consistency**: for any given shade number (e.g. 400, 600, 800), the WCAG contrast ratio of that shade against white and against black is approximately equal across all hues in the system. This means a team can swap `color.blue.600` for `color.red.600` in a component and the accessibility characteristics are preserved — no re-audit required. This property is what makes the token system safe for vibe-coding and reliable for design hand-off.

**Scale generation algorithm:** Given a seed hex color, generate a large candidate pool by stepping brightness up and down in small increments using `chroma-js`. For each of the 19 target shade indices, select the candidate whose contrast ratio against white (for shades 50–450) or against black (for shades 500–950) is closest to a pre-defined target contrast value for that index. The target contrast values are fixed constants defined once in `backend/src/pipeline/palette/generator.ts` — they are not derived per-hue. This is what produces the cross-hue consistency guarantee.

The algorithm works for neutral/gray inputs because it operates on brightness adjustments, not hue manipulation. A gray seed produces a valid grayscale using the same process as any chromatic input.

For projects with existing brand colors, the seed hex is the user-provided value. The closest generated shade to the seed is identified as the "anchor" and noted in the token metadata, but the full scale is still generated by the contrast-targeting algorithm — the seed is not forced into a specific step position, since that would compromise the cross-hue consistency property.

**Spacing primitives:** Derived from the base spacing unit. Scale: base × [0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24]. Named `space-1` through `space-24` (following the base unit multiplier, not px values).

**Type size primitives:** Derived from the scale ratio and a base size of 16px. Named `text-xs` through `text-5xl` with computed rem values.

**Radius primitives:** Derived from the radius personality axis. Four named steps: `radius-sm`, `radius-md`, `radius-lg`, `radius-full`.

**Shadow primitives:** Derived from the dimensionality axis. Three named steps: `shadow-sm`, `shadow-md`, `shadow-lg`. Flat personality sets all to `none`.

### Layer 2 — Semantic Tokens

Role assignments that reference primitives. These are what component code uses.

**Color semantic tokens (always generated):**

```
color.action.primary          → color.{primary}.600 (light) / color.{primary}.400 (dark)
color.action.primary.hover    → color.{primary}.700 (light) / color.{primary}.300 (dark)
color.action.primary.fg       → color.neutral.50  (always — text on primary bg)
color.action.secondary        → color.neutral.100 (light) / color.neutral.800 (dark)
color.action.secondary.fg     → color.neutral.900 (light) / color.neutral.50 (dark)
color.action.destructive      → color.red.600 (light) / color.red.400 (dark)
color.action.destructive.fg   → color.neutral.50

color.surface.default         → color.neutral.50 (light) / color.neutral.950 (dark)
color.surface.raised          → color.neutral.0/#ffffff (light) / color.neutral.900 (dark)
color.surface.overlay         → color.neutral.0/#ffffff (light) / color.neutral.850 (dark)
color.surface.subtle          → color.neutral.100 (light) / color.neutral.800 (dark)

color.text.primary            → color.neutral.950 (light) / color.neutral.50 (dark)
color.text.secondary          → color.neutral.600 (light) / color.neutral.400 (dark)
color.text.disabled           → color.neutral.400 (light) / color.neutral.600 (dark)
color.text.on-action          → color.neutral.50 (always)

color.border.default          → color.neutral.200 (light) / color.neutral.700 (dark)
color.border.strong           → color.neutral.400 (light) / color.neutral.500 (dark)
color.border.action           → color.action.primary

color.feedback.success        → color.green.600 / color.green.400
color.feedback.warning        → color.amber.600 / color.amber.400
color.feedback.error          → color.red.600 / color.red.400
color.feedback.info           → color.blue.600 / color.blue.400
```

All semantic color pairs (foreground on background) are validated against WCAG AA at generation time. Any pairing that fails the 4.5:1 threshold for normal text or 3:1 for large text / UI components causes the generator to automatically adjust to the nearest passing step.

**Typography semantic tokens:**

```
font.family.display    → selected display face
font.family.body       → selected body face
font.family.ui         → selected body face (same by default)
font.family.code       → 'JetBrains Mono', monospace

font.size.xs through font.size.5xl  → derived from scale
font.weight.normal     → 400
font.weight.medium     → 500
font.weight.semibold   → 600
font.weight.bold       → 700
font.line-height.tight → 1.25
font.line-height.normal → 1.5
font.line-height.relaxed → 1.75
```

**Spacing semantic tokens:**

```
space.component.xs through space.component.xl  → subset of spacing primitives
space.layout.xs through space.layout.xl        → larger subset of spacing primitives
```

**Radius and shadow:**

```
radius.sm / radius.md / radius.lg / radius.full → from primitives
shadow.sm / shadow.md / shadow.lg               → from primitives
```

### Layer 3 — Component Tokens

Per-component semantic aliases. These allow individual components to be adjusted without changing the global semantic layer. Examples:

```
button.padding.sm         → space.component.xs space.component.sm
button.padding.md         → space.component.sm space.component.md
button.padding.lg         → space.component.md space.component.lg
button.border-radius      → radius.md
button.font-weight        → font.weight.semibold

input.padding             → space.component.sm space.component.md
input.border-radius       → radius.md
input.border-color        → color.border.default
input.border-color.focus  → color.border.action
```

### Dark Mode

If dark mode is enabled, every semantic token has two values: a light mode value and a dark mode value. In `variables.css`, these are expressed as:

```css
:root {
  --color-action-primary: /* light value */;
}
[data-theme="dark"] {
  --color-action-primary: /* dark value */;
}
```

Dark mode is toggled by setting `data-theme="dark"` on the root `<html>` element. No CSS-in-JS or JavaScript theming logic is required.

---

## 7. Component System

All generated components use Base UI as the behavioral foundation. Generated code is React + TypeScript + Tailwind CSS.

### Architectural Rules for Generated Components

These rules apply to all generated component code and are stated explicitly in the generated `docs/README.md` so they persist with the codebase:

- Components use only semantic tokens and component tokens via CSS custom properties. Primitive tokens and arbitrary Tailwind values are never used in component code.
- All interactive states (hover, focus, active, disabled) use token-derived values, never hardcoded colors.
- Focus-visible outlines use `color.border.action` and are always present — never removed.
- All Base UI behavior (accessibility semantics, keyboard navigation, ARIA attributes) is inherited from the Base UI primitives and must not be overridden unless explicitly documented.
- Component props interfaces are exported from `{component}.types.ts` separately from the component implementation.

### Tier 1 Components — Base UI Wrappers

Each Tier 1 component exports:
- A default export: the styled component
- Named variants via a `variant` prop (primary, secondary, ghost, destructive where applicable)
- Named sizes via a `size` prop (sm, md, lg)
- Full TypeScript props interface extending the underlying Base UI component's props

Generated code pattern (Button example):

```tsx
// button.tsx
import { Button as BaseButton } from '@base-ui-components/react/button'
import type { ButtonProps } from './button.types'

export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return (
    <BaseButton
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

const buttonVariants = cva(
  'inline-flex items-center justify-center font-[--button-font-weight] rounded-[--button-border-radius] transition-colors focus-visible:outline-2 focus-visible:outline-[--color-border-action] disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-[--color-action-primary] text-[--color-action-primary-fg] hover:bg-[--color-action-primary-hover]',
        secondary: 'bg-[--color-action-secondary] text-[--color-action-secondary-fg]',
        ghost: 'bg-transparent text-[--color-text-primary] hover:bg-[--color-surface-subtle]',
        destructive: 'bg-[--color-action-destructive] text-[--color-action-destructive-fg]',
      },
      size: {
        sm: 'text-[--font-size-sm] px-[--button-padding-sm]',
        md: 'text-[--font-size-base] px-[--button-padding-md]',
        lg: 'text-[--font-size-lg] px-[--button-padding-lg]',
      },
    },
  }
)
```

### Tier 2 Components — Composed

Tier 2 components are assembled from Tier 1 components and HTML elements. They do not wrap Base UI components directly — they compose the Tier 1 wrappers. They follow the same token usage rules as Tier 1.

---

## 8. Documentation Generation

Three documentation files are generated deterministically from the `ProjectConfig`. No LLM is required. All three are included in the export package.

### `docs/README.md`

Human-readable overview. Sections:

1. What was generated (project name, type, scope summary, mode, generation date)
2. Installation: how to add the token CSS file to the project root, how to configure Tailwind to use the generated config
3. Token usage: how to reference semantic tokens in component code (CSS custom property syntax and Tailwind class syntax)
4. Dark mode: how to toggle `data-theme="dark"` on the root element
5. Component usage: how to import components, how to extend them
6. How to regenerate: the project URL and CLI command

### `docs/tokens.md`

Complete token reference. For each token: name, type, resolved light value, resolved dark value (if applicable), semantic role description, and usage guidance. Organized by layer (primitives → semantic → component). Color tokens rendered as inline swatches.

### `docs/decisions.md`

Design rationale for each major decision. Generated from a lookup of decision → rationale templates, filled with the specific choices made. Examples:

- Type scale: "A 1.25 ratio (minor third) produces a compact, clearly hierarchical scale well-suited to data-dense SaaS interfaces. The steps are close enough that they feel related, while distinct enough to create clear hierarchy without large visual jumps."
- Radius choice: "Soft border radius (4–8px) balances approachability with the professional character expected in productivity tools. Fully sharp corners can feel dated; fully rounded corners can feel playful in the wrong context."
- Color approach: "A single saturated primary with a cool gray neutral family keeps the interface focused and professional. The primary color carries all interactive meaning; the neutral family handles all structural and content surfaces."

The rationale vocabulary is specific and design-literate. It explains tradeoffs, not just descriptions.

### `docs/agent-spec.json`

See Section 9.

---

## 9. Agent API

The agent API is a public read-only JSON endpoint that serves the full system specification for a saved project. It is designed to be included in the context of a coding agent session so the agent understands how to write compliant code for the design system.

### Endpoint

```
GET /api/v1/systems/:projectId/spec
```

No authentication required. The project ID is the only "key." Projects are public by default in V1.

Response is `agent-spec.json` generated live from the current `ProjectConfig`. The file is also included in the export package at the time of download.

### `agent-spec.json` Structure

```json
{
  "version": "1.0",
  "projectId": "abc123",
  "projectName": "Acme Design System",
  "generatedAt": "2026-01-01T00:00:00Z",
  "config": {
    "projectType": "saas",
    "modes": ["light", "dark"],
    "componentScope": ["forms", "navigation", "overlays", "feedback", "data-display", "layout"]
  },
  "tokens": {
    "primitives": { /* full W3C DTCG primitives object */ },
    "semantic": { /* full W3C DTCG semantic object */ },
    "component": { /* full W3C DTCG component object */ }
  },
  "components": [
    {
      "name": "Button",
      "importPath": "components/button/button",
      "baseUIComponent": "@base-ui-components/react/button",
      "variants": ["primary", "secondary", "ghost", "destructive"],
      "sizes": ["sm", "md", "lg"],
      "defaultVariant": "primary",
      "defaultSize": "md",
      "tokenRefs": ["button.padding.sm", "button.padding.md", "button.padding.lg", "button.border-radius"],
      "accessibilityNotes": "Inherits all ARIA semantics from Base UI Button. Do not remove the focus-visible outline — it is required for keyboard navigation.",
      "usageGuidance": "Use the primary variant for the single most important action on a surface. Use ghost for tertiary actions. Destructive is reserved for irreversible actions."
    }
  ],
  "rules": {
    "tokenUsage": "Always reference semantic tokens (color.action.primary) or component tokens (button.padding.md) in component code. Never reference primitive tokens (color.blue.600) directly.",
    "darkMode": "Dark mode is toggled by setting data-theme='dark' on the root <html> element. No JavaScript theming logic is required.",
    "colorExtension": "To add a new semantic color, add it to semantic.json referencing an existing primitive. Do not add new primitives unless the hue family does not exist.",
    "componentExtension": "New components should follow the same pattern: thin Base UI wrapper, CVA for variants, CSS custom property references for all token values.",
    "accessibilityRequirement": "All interactive components must have visible focus states using color.border.action. All color combinations must maintain WCAG AA contrast ratios."
  }
}
```

---

## 10. CLI Tool

The CLI is a thin script. All generation logic lives on the platform. The CLI contains no knowledge of file structure, token format, or component output.

### Installation and Usage

```bash
# Initialize design system in current directory
npx @ds-gen/cli init --project=<project-id>

# Update an existing integration (re-pulls latest export)
npx @ds-gen/cli sync
```

`init` reads the project ID, authenticates against the platform API (prompts for auth token on first use, stores in local config), fetches the current export manifest, and writes all files to the target directory (default: `./design-system/`).

`sync` reads the project ID from `.design-system-meta.json` in the current directory and re-runs the export.

### Design Principle

The manifest served by the platform tells the CLI exactly what files to write and where. The CLI is a dumb file writer. If the platform changes its output format, directory structure, or file names, the CLI does not need to change — the manifest handles it. This is the only reason the CLI can remain stable across platform evolution.

The manifest format:

```json
{
  "projectId": "abc123",
  "files": [
    { "path": "tokens/primitives.json", "content": "..." },
    { "path": "tokens/semantic.json", "content": "..." }
  ]
}
```

### Copy-Paste Backstop

The ZIP download from Stage 4 produces identical files to what the CLI writes. Any user who cannot or does not want to use the CLI can download the ZIP and manually place files in their project. The output is identical.

---

## 11. Figma Integration

### V1 — Token File Import via Tokens Studio

The Figma integration path in V1:

1. User duplicates the **Base UI v0.1 community Figma file** into their workspace (one-click from Figma Community).
2. User installs the **Tokens Studio** plugin (free, available in Figma Community).
3. User downloads `tokens/semantic.json` from the export package (or copies the token endpoint URL).
4. In Tokens Studio: Load → paste the JSON or provide the URL → Apply to document.

This applies all semantic color tokens as Figma variables, which are referenced by the Base UI component definitions in the community file. All components update to reflect the user's design system.

The Export page includes a "Figma setup guide" CTA that opens a step-by-step illustrated guide for this process. The guide is part of the application, not a PDF.

### Future — Native Figma Import

Figma is shipping native W3C DTCG import in late 2026. When available, step 4 becomes: drag `semantic.json` onto the Figma canvas. No plugin required.

### Future — Figma Plugin

A dedicated Figma plugin that authenticates with the platform and pulls the current token state directly will be considered after V1. It will call the agent API token endpoint and write variables directly without any file download step.

---

## 12. Accounts and Projects

### Anonymous Users

The full creation flow is accessible without an account. An anonymous user can complete all four stages and download the export package. Anonymous sessions are stored in browser `localStorage` as a `ProjectConfig` snapshot. If the user creates an account before leaving, their anonymous session is claimed and saved as their first project.

### Account Creation

Email and password only in V1. No OAuth. Prompted softly at export time, never before. The prompt never blocks the download.

### Saved Projects

A logged-in user's projects are listed on the home page. Each project stores the `ProjectConfig` that produced it. Re-exporting a project re-runs the generation pipeline against the current config — there is no stored output, only the config. This ensures any improvements to the generator are automatically reflected on re-export.

### Project Snapshots (schema defined, not used in V1)

The `project_snapshots` table is created in the initial schema to support future version history. In V1, no snapshots are written or read.

---

## 13. Home Page

The home page is the landing experience for logged-in users. It shows:

- A "New project" button that starts the creation flow
- A grid of existing saved projects, each showing: project name, project type chip, mode chips (light/dark), last exported date, a thumbnail of the primary palette
- A "Continue" link on any project that was never exported returns to Stage 4
- A project card overflow menu: Rename, Duplicate, Delete

For new users with no projects, the home page shows an empty state with a prominent "Create your first design system" CTA.

---

## 14. Accessibility

Accessibility is not a feature — it is a constraint on every part of the system.

**The generator itself (the builder UI):** All interactive elements are keyboard accessible. All icons have accessible labels. All form inputs have associated labels. Color choices in the builder UI do not rely solely on color to convey meaning. The builder UI meets WCAG AA.

**The generated output:** The generator is incapable of producing an inaccessible design system. WCAG AA contrast validation runs at generation time on every semantic color pairing. Any failing pairing is automatically corrected to the nearest passing step before output is produced. This guarantee is stated in the generated `docs/README.md`.

**Generated component code:** Every generated component inherits Base UI's accessibility semantics. Focus-visible outlines are always present in generated code and use `color.border.action`. The `accessibilityNotes` field in `agent-spec.json` documents per-component accessibility requirements for coding agents maintaining the system.

**Documentation:** Accessibility rationale and requirements are included in `docs/components.md` per component and in `docs/README.md` as a general section.

---

## 15. Out of Scope — V1

The following are explicitly not in scope for V1. They may be considered for future versions.

- Team collaboration and sharing
- Version history and rollback
- LLM-assisted features (palette suggestions, rationale expansions)
- Figma plugin (token import via Tokens Studio is the V1 path)
- Framework targets other than React + Tailwind
- Tier 3 components (page-level patterns)
- Design system maintenance platform features (change tracking, component governance)
- Stripe billing / paid tiers (the tool is free to use in V1)
- Email notifications
- OAuth (email/password only)
- CLI token-based auth (the V1 CLI prompt-based auth flow is sufficient)

---

*End of specification. Version 1.0.*
