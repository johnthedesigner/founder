import { describe, it, expect } from 'vitest'
import { generateComponentTokens } from '../../../src/pipeline/tokens/component'
import { generateSemanticTokens } from '../../../src/pipeline/tokens/semantic'
import { generatePrimitives } from '../../../src/pipeline/tokens/primitives'
import { DEFAULT_CONFIG } from '../../../src/pipeline/palette/defaults'
import type { ProjectConfig } from '@ds-gen/types'

const TIER_1 = [
  'button',
  'input',
  'select',
  'checkbox',
  'radio',
  'switch',
  'dialog',
  'tooltip',
  'popover',
  'tabs',
  'menu',
  'slider',
]
const TIER_2 = ['form-field', 'card', 'badge', 'alert', 'avatar']

function buildAll(config: ProjectConfig) {
  const primitives = generatePrimitives(config)
  const semantic = generateSemanticTokens(primitives, config)
  const component = generateComponentTokens(semantic, config)
  return { primitives, semantic, component }
}

// Resolve a compound semantic reference like "space.component.sm space.component.md"
// against a flat semantic Record, returning total numeric px value
function resolvePx(spacing: Record<string, string>, ref: string): number {
  return ref
    .trim()
    .split(/\s+/)
    .reduce((sum, name) => sum + parseInt(spacing[name] ?? '0', 10), 0)
}

describe('generateComponentTokens — component presence', () => {
  const { semantic, component } = buildAll(DEFAULT_CONFIG)
  void semantic

  it('contains all 12 Tier 1 components', () => {
    for (const name of TIER_1) {
      expect(component, `missing component: ${name}`).toHaveProperty(name)
    }
  })

  it('contains all 5 Tier 2 components', () => {
    for (const name of TIER_2) {
      expect(component, `missing component: ${name}`).toHaveProperty(name)
    }
  })

  it('each component entry is a non-empty object', () => {
    for (const name of [...TIER_1, ...TIER_2]) {
      expect(Object.keys(component[name] ?? {})).not.toHaveLength(0)
    }
  })
})

describe('generateComponentTokens — button tokens', () => {
  const { component } = buildAll(DEFAULT_CONFIG)
  const btn = component.button

  it('button.padding.sm is present', () => {
    expect(btn['button.padding.sm']).toBeDefined()
  })

  it('button.padding.md is present', () => {
    expect(btn['button.padding.md']).toBeDefined()
  })

  it('button.padding.lg is present', () => {
    expect(btn['button.padding.lg']).toBeDefined()
  })

  it('button.border-radius is present', () => {
    expect(btn['button.border-radius']).toBeDefined()
  })
})

describe('generateComponentTokens — input tokens', () => {
  const { component } = buildAll(DEFAULT_CONFIG)
  const inp = component.input

  it('input.padding is present', () => {
    expect(inp['input.padding']).toBeDefined()
  })

  it('input.border-radius is present', () => {
    expect(inp['input.border-radius']).toBeDefined()
  })

  it('input.border-color is present', () => {
    expect(inp['input.border-color']).toBeDefined()
  })

  it('input.border-color.focus is present', () => {
    expect(inp['input.border-color.focus']).toBeDefined()
  })
})

describe('generateComponentTokens — semantic reference validation', () => {
  const { component } = buildAll(DEFAULT_CONFIG)

  it('no value starts with "space-" (primitive spacing name)', () => {
    for (const [component_name, tokens] of Object.entries(component)) {
      for (const [key, value] of Object.entries(tokens)) {
        expect(
          value.startsWith('space-'),
          `${component_name}.${key} = "${value}" starts with "space-"`,
        ).toBe(false)
      }
    }
  })

  it('no value is a bare px value matching /^\\d+px$/', () => {
    const barePx = /^\d+px$/
    for (const [component_name, tokens] of Object.entries(component)) {
      for (const [key, value] of Object.entries(tokens)) {
        expect(
          barePx.test(value),
          `${component_name}.${key} = "${value}" is a raw px value`,
        ).toBe(false)
      }
    }
  })
})

describe('generateComponentTokens — density affects resolved spacing', () => {
  it('compact produces smaller button.padding.md than spacious', () => {
    const compact = buildAll({
      ...DEFAULT_CONFIG,
      shape: { ...DEFAULT_CONFIG.shape, density: 'compact' },
    })
    const spacious = buildAll({
      ...DEFAULT_CONFIG,
      shape: { ...DEFAULT_CONFIG.shape, density: 'spacious' },
    })

    const compactPx = resolvePx(
      compact.semantic.spacing,
      compact.component.button['button.padding.md'],
    )
    const spaciousPx = resolvePx(
      spacious.semantic.spacing,
      spacious.component.button['button.padding.md'],
    )
    expect(compactPx).toBeLessThan(spaciousPx)
  })
})

describe('generateComponentTokens — personality affects resolved radius', () => {
  it('professional and approachable produce different button.border-radius values', () => {
    const pro = buildAll(DEFAULT_CONFIG) // DEFAULT_CONFIG uses professional
    const app = buildAll({
      ...DEFAULT_CONFIG,
      shape: { ...DEFAULT_CONFIG.shape, personality: 'approachable' },
    })

    const proRef = pro.component.button['button.border-radius']
    const appRef = app.component.button['button.border-radius']

    // Both reference the same semantic name (radius.md), but resolved values differ
    const proResolved = pro.semantic.radii[proRef]
    const appResolved = app.semantic.radii[appRef]
    expect(proResolved).not.toBe(appResolved)
  })
})
