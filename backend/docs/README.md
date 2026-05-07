# Design System

> Generated 2026-05-07T11:57:10.519Z

This design system was generated from a `saas` project configuration with a `#3b82f6` primary color, `Inter` typography, `balanced` density, and a `professional` shape personality. It contains **59 design tokens** and **10 components**.

---

## What Was Generated

The following files were produced:

| Category | Contents |
|---|---|
| `tokens/` | CSS custom properties for all design tokens (semantic and component layers) |
| `components/` | Production-ready TSX components using `@base-ui-components/react` primitives |
| `tokens.md` | Full token reference with values for each mode |
| `components.md` | Component API reference with usage guidance |
| `decisions.md` | Design rationale for each token and shape decision |
| `agent-spec.json` | Machine-readable spec for AI coding assistants |

**Components included:** `Button`, `Input`, `Select`, `Checkbox`, `Radio`, `Switch`, `Slider`, `Tabs`, `Menu`, `Form Field`

---

## Installation

Install the required peer dependencies if they are not already in your project:

```sh
npm install @base-ui-components/react cva
```

Copy the `components/` and `tokens/` directories into your project source tree. If you use Tailwind CSS, import `tokens/tailwind.config.js` into your Tailwind configuration.

---

## Token Usage

Design tokens are delivered as CSS custom properties. Reference them in your stylesheets or component classes using `var(--token-name)`.

**Example — using a semantic color token:**

```css
.my-element {
  background-color: var(--color-surface-default);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-default);
}
```

**Example — using a component token inside a component file:**

```tsx
<div className="bg-[--card-background] rounded-[--card-border-radius]">
  {/* card content */}
</div>
```

Token names map directly to the semantic layer: dots in the token name become hyphens in the CSS custom property (e.g. `color.action.primary` → `--color-action-primary`).

---

## Dark Mode

This design system was generated for **light mode only**. To add dark mode support, regenerate with `modes: ['light', 'dark']` in your `ProjectConfig`. All semantic color tokens will gain dark-mode counterparts automatically.

---

## Component Usage

Components are located in `components/<name>/<name>.tsx`. Import them directly:

```tsx
import { Button } from './components/button/button'
import { Input } from './components/input/input'
import { FormField } from './components/form-field/form-field'
```

**Example — form with label and validation:**

```tsx
<FormField label="Email address" error={errors.email} required>
  <Input type="email" {...register('email')} />
</FormField>
```

**Example — button variants:**

```tsx
<Button variant="primary">Save changes</Button>
<Button variant="secondary">Cancel</Button>
<Button variant="destructive">Delete account</Button>
```

See `components.md` for the full component API reference.

---

## How to Regenerate

To regenerate this design system with updated settings, install the `@ds-gen/cli` package and run:

```sh
npx ds-gen generate --config ds-gen.config.ts
```

Your `ds-gen.config.ts` exports a `ProjectConfig` object. Edit it to change the primary color, typography, shape personality, or component scope, then re-run the command. Generated files are fully overwritten on each run — do not edit them directly.
