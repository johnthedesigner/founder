import { describe, it, expect } from 'vitest'
import { generateSemanticTokens } from '../../../src/pipeline/tokens/semantic'
import { generatePrimitives } from '../../../src/pipeline/tokens/primitives'
import { contrastRatio } from '../../../src/pipeline/tokens/accessibility'
import { DEFAULT_CONFIG } from '../../../src/pipeline/palette/defaults'
import type { ProjectConfig } from '@ds-gen/types'

const REQUIRED_COLOR_KEYS = [
  'color.action.primary',
  'color.action.primary.hover',
  'color.action.primary.fg',
  'color.action.secondary',
  'color.action.secondary.fg',
  'color.action.destructive',
  'color.action.destructive.fg',
  'color.surface.default',
  'color.surface.raised',
  'color.surface.overlay',
  'color.surface.subtle',
  'color.text.primary',
  'color.text.secondary',
  'color.text.disabled',
  'color.text.on-action',
  'color.border.default',
  'color.border.strong',
  'color.border.action',
  'color.feedback.success',
  'color.feedback.warning',
  'color.feedback.error',
  'color.feedback.info',
]

// Pairs to enforce for WCAG AA validation tests: [fg key, bg key, min ratio]
const WCAG_TEXT_PAIRS: Array<[string, string, number]> = [
  ['color.action.primary.fg', 'color.action.primary', 4.5],
  ['color.action.secondary.fg', 'color.action.secondary', 4.5],
  ['color.action.destructive.fg', 'color.action.destructive', 4.5],
  ['color.text.primary', 'color.surface.default', 4.5],
  ['color.text.secondary', 'color.surface.default', 4.5],
  ['color.text.on-action', 'color.action.primary', 4.5],
]

function assertPairsPass(
  colors: Record<string, { light: string; dark?: string }>,
  mode: 'light' | 'dark',
) {
  for (const [fgKey, bgKey, ratio] of WCAG_TEXT_PAIRS) {
    const fg = mode === 'light' ? colors[fgKey]?.light : colors[fgKey]?.dark
    const bg = mode === 'light' ? colors[bgKey]?.light : colors[bgKey]?.dark
    if (!fg || !bg) continue
    expect(
      contrastRatio(fg, bg),
      `${fgKey} on ${bgKey} (${mode}): ${fg} on ${bg}`,
    ).toBeGreaterThanOrEqual(ratio)
  }
}

describe('generateSemanticTokens — color token keys', () => {
  const primitives = generatePrimitives(DEFAULT_CONFIG)
  const result = generateSemanticTokens(primitives, DEFAULT_CONFIG)

  it('contains all 22 required color keys', () => {
    for (const key of REQUIRED_COLOR_KEYS) {
      expect(result.colors, `missing key: ${key}`).toHaveProperty(key)
    }
  })

  it('every color entry has a light value', () => {
    for (const [key, val] of Object.entries(result.colors)) {
      expect(typeof val.light, `${key}.light`).toBe('string')
      expect(val.light.length, `${key}.light empty`).toBeGreaterThan(0)
    }
  })
})

describe('generateSemanticTokens — typography tokens', () => {
  const primitives = generatePrimitives(DEFAULT_CONFIG)
  const result = generateSemanticTokens(primitives, DEFAULT_CONFIG)

  it('contains all four font family keys', () => {
    expect(result.typography['font.family.display']).toBeDefined()
    expect(result.typography['font.family.body']).toBeDefined()
    expect(result.typography['font.family.ui']).toBeDefined()
    expect(result.typography['font.family.code']).toBeDefined()
  })

  it('font.family values match the config', () => {
    expect(result.typography['font.family.display']).toBe(
      DEFAULT_CONFIG.typography.displayFace,
    )
    expect(result.typography['font.family.body']).toBe(
      DEFAULT_CONFIG.typography.bodyFace,
    )
    expect(result.typography['font.family.code']).toBe(
      DEFAULT_CONFIG.typography.codeFace,
    )
  })

  it('contains font.size.xs through font.size.5xl (9 entries)', () => {
    const sizeKeys = [
      'font.size.xs',
      'font.size.sm',
      'font.size.base',
      'font.size.lg',
      'font.size.xl',
      'font.size.2xl',
      'font.size.3xl',
      'font.size.4xl',
      'font.size.5xl',
    ]
    for (const key of sizeKeys) {
      expect(result.typography, `missing ${key}`).toHaveProperty(key)
    }
  })

  it('font.size.5xl > font.size.4xl > font.size.3xl', () => {
    const v3xl = parseFloat(result.typography['font.size.3xl'])
    const v4xl = parseFloat(result.typography['font.size.4xl'])
    const v5xl = parseFloat(result.typography['font.size.5xl'])
    expect(v4xl).toBeGreaterThan(v3xl)
    expect(v5xl).toBeGreaterThan(v4xl)
  })

  it('contains all four font weight keys', () => {
    expect(result.typography['font.weight.normal']).toBe('400')
    expect(result.typography['font.weight.medium']).toBe('500')
    expect(result.typography['font.weight.semibold']).toBe('600')
    expect(result.typography['font.weight.bold']).toBe('700')
  })

  it('contains all three line-height keys', () => {
    expect(result.typography['font.line-height.tight']).toBe('1.25')
    expect(result.typography['font.line-height.normal']).toBe('1.5')
    expect(result.typography['font.line-height.relaxed']).toBe('1.75')
  })
})

describe('generateSemanticTokens — spacing, radii, shadows', () => {
  const primitives = generatePrimitives(DEFAULT_CONFIG)
  const result = generateSemanticTokens(primitives, DEFAULT_CONFIG)

  it('contains component and layout spacing tokens', () => {
    expect(result.spacing['space.component.xs']).toBeDefined()
    expect(result.spacing['space.component.xl']).toBeDefined()
    expect(result.spacing['space.layout.xs']).toBeDefined()
    expect(result.spacing['space.layout.xl']).toBeDefined()
  })

  it('contains radius tokens', () => {
    expect(result.radii['radius.sm']).toBeDefined()
    expect(result.radii['radius.md']).toBeDefined()
    expect(result.radii['radius.lg']).toBeDefined()
    expect(result.radii['radius.full']).toBeDefined()
  })

  it('contains shadow tokens', () => {
    expect(result.shadows['shadow.sm']).toBeDefined()
    expect(result.shadows['shadow.md']).toBeDefined()
    expect(result.shadows['shadow.lg']).toBeDefined()
  })
})

describe('generateSemanticTokens — WCAG AA enforcement (DEFAULT_CONFIG)', () => {
  const primitives = generatePrimitives(DEFAULT_CONFIG)
  const result = generateSemanticTokens(primitives, DEFAULT_CONFIG)

  it('all text pairs meet 4.5:1 in light mode', () => {
    assertPairsPass(result.colors, 'light')
  })

  it('DEFAULT_CONFIG produces zero corrections (light mode only)', () => {
    expect(result.corrections).toHaveLength(0)
  })
})

describe('generateSemanticTokens — auto-correction', () => {
  // Dark mode with a light seed causes text.secondary (neutral.400) on
  // surface.default (neutral.950) to fall below 4.5:1, triggering correction
  const failingConfig: ProjectConfig = {
    ...DEFAULT_CONFIG,
    color: { ...DEFAULT_CONFIG.color, primaryHex: '#a8c5f5' },
    modes: ['light', 'dark'],
  }
  const primitives = generatePrimitives(failingConfig)
  const result = generateSemanticTokens(primitives, failingConfig)

  it('corrections array is non-empty', () => {
    expect(result.corrections.length).toBeGreaterThan(0)
  })

  it('each correction has required fields', () => {
    for (const c of result.corrections) {
      expect(typeof c.token).toBe('string')
      expect(typeof c.originalValue).toBe('string')
      expect(typeof c.correctedValue).toBe('string')
      expect(typeof c.reason).toBe('string')
    }
  })

  it('corrected output still meets 4.5:1 for all text pairs in light mode', () => {
    assertPairsPass(result.colors, 'light')
  })

  it('corrected output still meets 4.5:1 for all text pairs in dark mode', () => {
    assertPairsPass(result.colors, 'dark')
  })
})

describe('generateSemanticTokens — single vs dual mode', () => {
  const lightPrimitives = generatePrimitives(DEFAULT_CONFIG)
  const lightResult = generateSemanticTokens(lightPrimitives, DEFAULT_CONFIG)

  const darkConfig: ProjectConfig = { ...DEFAULT_CONFIG, modes: ['light', 'dark'] }
  const darkPrimitives = generatePrimitives(darkConfig)
  const darkResult = generateSemanticTokens(darkPrimitives, darkConfig)

  it('single-mode config: every color token has light value but no dark', () => {
    for (const [key, val] of Object.entries(lightResult.colors)) {
      expect(typeof val.light, `${key}.light`).toBe('string')
      expect(val.dark, `${key}.dark should be absent`).toBeUndefined()
    }
  })

  it('dual-mode config: every color token has both light and dark values', () => {
    for (const [key, val] of Object.entries(darkResult.colors)) {
      expect(typeof val.light, `${key}.light`).toBe('string')
      expect(typeof val.dark, `${key}.dark`).toBe('string')
    }
  })

  it('color.surface.default dark ≠ light', () => {
    const t = darkResult.colors['color.surface.default']
    expect(t.light).not.toBe(t.dark)
  })

  it('color.text.primary dark ≠ light', () => {
    const t = darkResult.colors['color.text.primary']
    expect(t.light).not.toBe(t.dark)
  })
})
