import type { GeneratedSystem, ProjectConfig } from '@ds-gen/types'

export function generateReadme(system: GeneratedSystem, config: ProjectConfig): string {
  const components = system.components
  const componentList = components.map((c) => `\`${c.name}\``).join(', ')
  const hasDark = config.modes.includes('dark')
  const primaryHex = config.color.primaryHex
  const bodyFace = config.typography.bodyFace
  const density = config.shape.density
  const personality = config.shape.personality

  const scopeCount = components.length
  const tokenCount =
    Object.keys(system.tokens.semantic.colors).length +
    Object.keys(system.tokens.semantic.typography).length +
    Object.keys(system.tokens.semantic.spacing).length +
    Object.keys(system.tokens.semantic.radii).length +
    Object.keys(system.tokens.semantic.shadows).length

  const correctionNote =
    system.metadata.corrections.length > 0
      ? `\n> **Note:** ${system.metadata.corrections.length} token value(s) were automatically adjusted to meet WCAG AA contrast requirements.\n`
      : ''

  return `# Design System

> Generated ${system.metadata.generatedAt}
${correctionNote}
This design system was generated from a \`${config.projectType}\` project configuration with a \`${primaryHex}\` primary color, \`${bodyFace}\` typography, \`${density}\` density, and a \`${personality}\` shape personality. It contains **${tokenCount} design tokens** and **${scopeCount} components**.

---

## What Was Generated

The following files were produced:

| Category | Contents |
|---|---|
| \`tokens/\` | CSS custom properties for all design tokens (semantic and component layers) |
| \`components/\` | Production-ready TSX components using \`@base-ui-components/react\` primitives |
| \`tokens.md\` | Full token reference with values for each mode |
| \`components.md\` | Component API reference with usage guidance |
| \`decisions.md\` | Design rationale for each token and shape decision |
| \`agent-spec.json\` | Machine-readable spec for AI coding assistants |

**Components included:** ${componentList}

---

## Installation

Install the required peer dependencies if they are not already in your project:

\`\`\`sh
npm install @base-ui-components/react cva
\`\`\`

Copy the \`components/\` and \`tokens/\` directories into your project source tree. If you use Tailwind CSS, import \`tokens/tailwind.config.js\` into your Tailwind configuration.

---

## Token Usage

Design tokens are delivered as CSS custom properties. Reference them in your stylesheets or component classes using \`var(--token-name)\`.

**Example — using a semantic color token:**

\`\`\`css
.my-element {
  background-color: var(--color-surface-default);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-default);
}
\`\`\`

**Example — using a component token inside a component file:**

\`\`\`tsx
<div className="bg-[--card-background] rounded-[--card-border-radius]">
  {/* card content */}
</div>
\`\`\`

Token names map directly to the semantic layer: dots in the token name become hyphens in the CSS custom property (e.g. \`color.action.primary\` → \`--color-action-primary\`).

---

## Dark Mode

${
  hasDark
    ? `This design system includes a dark mode token set. Apply the \`data-theme="dark"\` attribute to \`<html>\` (or your root element) to activate dark mode tokens:

\`\`\`html
<html data-theme="dark">
\`\`\`

All semantic color tokens automatically resolve to their dark-mode values when this attribute is present. No component changes are required.`
    : `This design system was generated for **light mode only**. To add dark mode support, regenerate with \`modes: ['light', 'dark']\` in your \`ProjectConfig\`. All semantic color tokens will gain dark-mode counterparts automatically.`
}

---

## Component Usage

Components are located in \`components/<name>/<name>.tsx\`. Import them directly:

\`\`\`tsx
import { Button } from './components/button/button'
import { Input } from './components/input/input'
import { FormField } from './components/form-field/form-field'
\`\`\`

**Example — form with label and validation:**

\`\`\`tsx
<FormField label="Email address" error={errors.email} required>
  <Input type="email" {...register('email')} />
</FormField>
\`\`\`

**Example — button variants:**

\`\`\`tsx
<Button variant="primary">Save changes</Button>
<Button variant="secondary">Cancel</Button>
<Button variant="destructive">Delete account</Button>
\`\`\`

See \`components.md\` for the full component API reference.

---

## How to Regenerate

To regenerate this design system with updated settings, install the \`@ds-gen/cli\` package and run:

\`\`\`sh
npx ds-gen generate --config ds-gen.config.ts
\`\`\`

Your \`ds-gen.config.ts\` exports a \`ProjectConfig\` object. Edit it to change the primary color, typography, shape personality, or component scope, then re-run the command. Generated files are fully overwritten on each run — do not edit them directly.
`
}
