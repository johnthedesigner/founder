import type { GeneratedSystem, ProjectConfig, ComponentSpec } from '@ds-gen/types'

function renderSpec(spec: ComponentSpec): string {
  const lines: string[] = []

  lines.push(`## ${spec.name}`)
  lines.push('')
  lines.push(spec.usageGuidance)
  lines.push('')

  if (spec.baseUIComponent) {
    lines.push(`**Base UI primitive:** \`${spec.baseUIComponent}\``)
    lines.push('')
  }

  if (spec.variants.length > 0) {
    lines.push(`**Variants:** ${spec.variants.map((v) => `\`${v}\``).join(', ')}`)
    lines.push('')
  }

  if (spec.sizes.length > 0) {
    lines.push(`**Sizes:** ${spec.sizes.map((s) => `\`${s}\``).join(', ')}`)
    lines.push('')
  }

  if (spec.tokenRefs.length > 0) {
    lines.push('**Token references:**')
    for (const ref of spec.tokenRefs) {
      lines.push(`- \`${ref}\``)
    }
    lines.push('')
  }

  lines.push('**Accessibility:**')
  lines.push(spec.accessibilityNotes)
  lines.push('')

  const importName = spec.name.replace(' ', '')
  const importPath = spec.importPath.split('/').pop() ?? spec.importPath

  lines.push('**Import:**')
  lines.push('```tsx')
  lines.push(`import { ${importName} } from './${spec.importPath}/${importPath}'`)
  lines.push('```')
  lines.push('')

  return lines.join('\n')
}

export function generateComponentsDoc(system: GeneratedSystem, config: ProjectConfig): string {
  void config

  const specs = system.components
  const componentCount = specs.length

  const byCategory = new Map<string, ComponentSpec[]>()
  for (const spec of specs) {
    const cat = spec.importPath.includes('form') || spec.importPath.includes('input') || spec.importPath.includes('select') || spec.importPath.includes('checkbox') || spec.importPath.includes('radio') || spec.importPath.includes('switch') || spec.importPath.includes('slider') || spec.importPath.includes('button')
      ? 'Forms'
      : spec.importPath.includes('dialog') || spec.importPath.includes('tooltip') || spec.importPath.includes('popover')
        ? 'Overlays'
        : spec.importPath.includes('tabs') || spec.importPath.includes('menu')
          ? 'Navigation'
          : spec.importPath.includes('badge') || spec.importPath.includes('alert')
            ? 'Feedback'
            : 'Data Display'
    const existing = byCategory.get(cat) ?? []
    existing.push(spec)
    byCategory.set(cat, existing)
  }

  const categoryOrder = ['Forms', 'Overlays', 'Navigation', 'Feedback', 'Data Display']

  const sections = categoryOrder
    .filter((cat) => byCategory.has(cat))
    .map((cat) => {
      const catSpecs = byCategory.get(cat)!
      const header = `# ${cat} Components\n\n`
      return header + catSpecs.map(renderSpec).join('\n---\n\n')
    })
    .join('\n\n---\n\n')

  return `# Component Reference

This design system includes **${componentCount} components**. Each component uses CSS custom properties for all visual tokens, making them easy to theme.

All components require \`@base-ui-components/react\` for interactive primitives.

---

${sections}
`
}
