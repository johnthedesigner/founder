import type { SemanticTokenSet, ComponentTokenSet, ColorMode } from '@ds-gen/types'

function cssVar(key: string): string {
  return `--${key.replace(/\./g, '-')}`
}

function cssValue(value: string): string {
  // Component token values are semantic token references — emit as var()
  if (/^[a-z][\w-]*(\.[a-z][\w-]+)+$/.test(value)) {
    return `var(${cssVar(value)})`
  }
  return value
}

function renderBlock(selector: string, props: string[]): string {
  return `${selector} {\n${props.map((p) => `  ${p}`).join('\n')}\n}`
}

export function serializeToCSS(
  semantic: SemanticTokenSet,
  component: ComponentTokenSet,
  modes: ColorMode[],
): string {
  const parts: string[] = []

  // --- :root block ---
  const rootProps: string[] = []

  // Light-mode colors (also default for single-mode configs)
  for (const [key, val] of Object.entries(semantic.colors)) {
    rootProps.push(`${cssVar(key)}: ${val.light};`)
  }

  // Typography
  for (const [key, val] of Object.entries(semantic.typography)) {
    rootProps.push(`${cssVar(key)}: ${val};`)
  }

  // Spacing
  for (const [key, val] of Object.entries(semantic.spacing)) {
    rootProps.push(`${cssVar(key)}: ${val};`)
  }

  // Radii
  for (const [key, val] of Object.entries(semantic.radii)) {
    rootProps.push(`${cssVar(key)}: ${val};`)
  }

  // Shadows
  for (const [key, val] of Object.entries(semantic.shadows)) {
    rootProps.push(`${cssVar(key)}: ${val};`)
  }

  // Component tokens
  for (const [componentName, tokens] of Object.entries(component)) {
    for (const [tokenKey, tokenValue] of Object.entries(tokens)) {
      const propName = `--${componentName}-${tokenKey.replace(/\./g, '-')}`
      rootProps.push(`${propName}: ${cssValue(tokenValue)};`)
    }
  }

  parts.push(renderBlock(':root', rootProps))

  // --- Dark mode block ---
  if (modes.includes('dark')) {
    const darkProps: string[] = []
    for (const [key, val] of Object.entries(semantic.colors)) {
      if (val.dark !== undefined) {
        darkProps.push(`${cssVar(key)}: ${val.dark};`)
      }
    }
    if (darkProps.length > 0) {
      parts.push(renderBlock('[data-theme="dark"]', darkProps))
    }
  }

  return parts.join('\n\n')
}
