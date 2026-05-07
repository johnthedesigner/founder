import type { GeneratedSystem, ProjectConfig } from '@ds-gen/types'
import { PALETTE_PRESETS } from '@ds-gen/types'

const VERSION = '1.0'

function deriveProjectName(config: ProjectConfig): string {
  const typeLabel: Record<string, string> = {
    saas: 'App',
    marketing: 'Site',
    mobile: 'Mobile App',
  }
  const suffix = typeLabel[config.projectType] ?? 'System'

  let prefix: string
  if (config.color.paletteId) {
    const preset = PALETTE_PRESETS.find((p) => p.id === config.color.paletteId)
    prefix = preset ? preset.name.split(' ')[0] : 'Custom'
  } else {
    const directionLabel: Record<string, string> = {
      'cool-professional': 'Professional',
      'warm-approachable': 'Approachable',
      'bold-high-contrast': 'Bold',
      'neutral-minimal': 'Minimal',
      'earth-tones': 'Natural',
    }
    prefix = directionLabel[config.color.colorDirection ?? 'cool-professional'] ?? 'Design'
  }

  return `${prefix} ${suffix} Design System`
}

function deriveProjectId(config: ProjectConfig): string {
  return `ds-${config.color.primaryHex.slice(1).toLowerCase()}-${config.projectType}`
}

function buildRules(config: ProjectConfig): string[] {
  const rules: string[] = [
    'Always import components from their own directory (e.g. `./components/button/button`).',
    'Never hard-code color hex values in component or page code. Reference CSS custom properties (e.g. `var(--color-action-primary)`) or use the generated component classes.',
    'Never override component token variables inline. If a token value needs to change for a variant or context, regenerate with an updated config.',
    'Wrap every form input in FormField to ensure accessible labels and error messages.',
    'Button: use `variant="primary"` for the main call-to-action per screen. Do not use two primary buttons side-by-side.',
    'Button: use `variant="destructive"` only for irreversible operations. Show a confirmation dialog before triggering the action.',
    `Spacing: use the generated spacing tokens (space.component.* for intra-component spacing, space.layout.* for page-level spacing). Base unit is derived from density="${config.shape.density}".`,
    `Typography: display headings use font.family.display (${config.typography.displayFace}). Body text and UI labels use font.family.body (${config.typography.bodyFace}).`,
    'Color: all interactive elements must meet WCAG AA contrast (4.5:1 for normal text, 3:1 for large text and UI components). The generated token set guarantees this for the semantic layer.',
    'Dark mode: activate by setting `data-theme="dark"` on the root element. Do not fork component files for dark mode; all tokens resolve automatically.',
    'Do not import from `@base-ui-components/react` directly in application code. Import from the generated component wrappers instead.',
  ]

  if (config.modes.includes('dark')) {
    rules.push('This system supports dark mode. Test all new UI in both light and dark modes before shipping.')
  }

  return rules
}

export function generateAgentSpec(system: GeneratedSystem, config: ProjectConfig): string {
  const projectId = deriveProjectId(config)
  const projectName = deriveProjectName(config)

  const tokensSnapshot = {
    colorCount: Object.keys(system.tokens.semantic.colors).length,
    typographyCount: Object.keys(system.tokens.semantic.typography).length,
    spacingCount: Object.keys(system.tokens.semantic.spacing).length,
    sampleColors: Object.fromEntries(
      Object.entries(system.tokens.semantic.colors)
        .slice(0, 8)
        .map(([k, v]) => [k, v.light]),
    ),
    fontFamilies: {
      display: system.tokens.semantic.typography['font.family.display'] ?? '',
      body: system.tokens.semantic.typography['font.family.body'] ?? '',
      code: system.tokens.semantic.typography['font.family.code'] ?? '',
    },
  }

  const components = system.components.map((spec) => ({
    name: spec.name,
    importPath: spec.importPath,
    variants: spec.variants,
    sizes: spec.sizes,
    defaultVariant: spec.defaultVariant,
    defaultSize: spec.defaultSize,
    tokenRefs: spec.tokenRefs,
    accessibilityNotes: spec.accessibilityNotes,
    usageGuidance: spec.usageGuidance,
  }))

  const spec = {
    version: VERSION,
    projectId,
    projectName,
    generatedAt: system.metadata.generatedAt,
    config: {
      projectType: config.projectType,
      modes: config.modes,
      componentScope: config.componentScope,
      primaryHex: config.color.primaryHex,
      colorDirection: config.color.colorDirection ?? null,
      paletteId: config.color.paletteId ?? null,
      neutralFamily: config.color.neutralFamily,
      typeStyle: config.typography.typeStyle,
      displayFace: config.typography.displayFace,
      bodyFace: config.typography.bodyFace,
      density: config.shape.density,
      personality: config.shape.personality,
      dimensionality: config.shape.dimensionality,
    },
    tokens: tokensSnapshot,
    components,
    rules: buildRules(config),
    corrections: system.metadata.corrections,
  }

  return JSON.stringify(spec, null, 2)
}
