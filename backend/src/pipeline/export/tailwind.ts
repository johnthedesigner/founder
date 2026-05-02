import type { SemanticTokenSet } from '@ds-gen/types'

function cssVar(key: string): string {
  return `var(--${key.replace(/\./g, '-')})`
}

function toTailwindKey(key: string): string {
  // "color.action.primary" → "action-primary" (strip top-level namespace)
  const parts = key.split('.')
  return parts.slice(1).join('-')
}

function renderObject(obj: Record<string, string>, indent = 6): string {
  const pad = ' '.repeat(indent)
  const lines = Object.entries(obj).map(([k, v]) => `${pad}'${k}': '${v}',`)
  return lines.join('\n')
}

export function serializeToTailwind(semantic: SemanticTokenSet): string {
  // Colors: group by second segment (action, surface, text, border, feedback)
  const colors: Record<string, string> = {}
  for (const key of Object.keys(semantic.colors)) {
    const tailwindKey = toTailwindKey(key)
    colors[tailwindKey] = cssVar(key)
  }

  // Font families
  const fontFamily: Record<string, string> = {}
  for (const key of Object.keys(semantic.typography)) {
    if (key.startsWith('font.family.')) {
      const name = key.split('.').pop()!
      fontFamily[name] = cssVar(key)
    }
  }

  // Font sizes
  const fontSize: Record<string, string> = {}
  for (const key of Object.keys(semantic.typography)) {
    if (key.startsWith('font.size.')) {
      const name = key.split('.').pop()!
      fontSize[name] = cssVar(key)
    }
  }

  // Font weights
  const fontWeight: Record<string, string> = {}
  for (const key of Object.keys(semantic.typography)) {
    if (key.startsWith('font.weight.')) {
      const name = key.split('.').pop()!
      fontWeight[name] = cssVar(key)
    }
  }

  // Spacing
  const spacing: Record<string, string> = {}
  for (const key of Object.keys(semantic.spacing)) {
    const tailwindKey = toTailwindKey(key)
    spacing[tailwindKey] = cssVar(key)
  }

  // Border radius
  const borderRadius: Record<string, string> = {}
  for (const key of Object.keys(semantic.radii)) {
    const name = key.split('.').pop()!
    borderRadius[name] = cssVar(key)
  }

  // Box shadow
  const boxShadow: Record<string, string> = {}
  for (const key of Object.keys(semantic.shadows)) {
    const name = key.split('.').pop()!
    boxShadow[name] = cssVar(key)
  }

  return `import type { Config } from 'tailwindcss'

const config: Config = {
  theme: {
    extend: {
      colors: {
${renderObject(colors)}
      },
      fontFamily: {
${renderObject(fontFamily)}
      },
      fontSize: {
${renderObject(fontSize)}
      },
      fontWeight: {
${renderObject(fontWeight)}
      },
      spacing: {
${renderObject(spacing)}
      },
      borderRadius: {
${renderObject(borderRadius)}
      },
      boxShadow: {
${renderObject(boxShadow)}
      },
    },
  },
}

export default config
`
}
