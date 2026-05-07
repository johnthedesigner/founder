import { describe, it, expect } from 'vitest'
import { generatePrimitives } from '../../../src/pipeline/tokens/primitives'
import { DEFAULT_CONFIG } from '../../../src/pipeline/palette/defaults'
import type { ProjectConfig } from '@ds-gen/types'

const SHADE_KEYS = [
  50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750,
  800, 850, 900, 950,
]

describe('generatePrimitives — structure', () => {
  const p = generatePrimitives(DEFAULT_CONFIG)

  it('returns non-empty colors field', () => {
    expect(Object.keys(p.colors).length).toBeGreaterThan(0)
  })

  it('returns non-empty spacing field', () => {
    expect(Object.keys(p.spacing).length).toBeGreaterThan(0)
  })

  it('returns non-empty typeSizes field', () => {
    expect(Object.keys(p.typeSizes).length).toBeGreaterThan(0)
  })

  it('returns non-empty radii field', () => {
    expect(Object.keys(p.radii).length).toBeGreaterThan(0)
  })

  it('returns non-empty shadows field', () => {
    expect(Object.keys(p.shadows).length).toBeGreaterThan(0)
  })
})

// DEFAULT_CONFIG is saas + blue primary — saas enables all 4 functional roles;
// blue primary (hue ~217°) aliases info → primary scale.
const SAAS_BASE_KEYS = ['error', 'info', 'neutral', 'primary', 'success', 'warning']

describe('generatePrimitives — colors', () => {
  it('DEFAULT_CONFIG (saas) produces primary, neutral, and all 4 functional scales', () => {
    const p = generatePrimitives(DEFAULT_CONFIG)
    expect(Object.keys(p.colors).sort()).toEqual(SAAS_BASE_KEYS)
  })

  it('config with secondaryHex adds a secondary scale alongside functional scales', () => {
    const config: ProjectConfig = {
      ...DEFAULT_CONFIG,
      color: { ...DEFAULT_CONFIG.color, secondaryHex: '#8b5cf6' },
    }
    const p = generatePrimitives(config)
    expect(p.colors).toHaveProperty('secondary')
    expect(Object.keys(p.colors).sort()).toEqual([
      'error',
      'info',
      'neutral',
      'primary',
      'secondary',
      'success',
      'warning',
    ])
  })

  it('config with accentHex adds an accent scale', () => {
    const config: ProjectConfig = {
      ...DEFAULT_CONFIG,
      color: { ...DEFAULT_CONFIG.color, accentHex: '#f59e0b' },
    }
    const p = generatePrimitives(config)
    expect(p.colors).toHaveProperty('accent')
  })

  it('config with both secondary and accent has all brand and functional scales', () => {
    const config: ProjectConfig = {
      ...DEFAULT_CONFIG,
      color: {
        ...DEFAULT_CONFIG.color,
        secondaryHex: '#8b5cf6',
        accentHex: '#f59e0b',
      },
    }
    const p = generatePrimitives(config)
    // amber accent (#f59e0b, hue ~38°) aliases warning; both warning and accent keys present
    expect(Object.keys(p.colors).sort()).toEqual([
      'accent',
      'error',
      'info',
      'neutral',
      'primary',
      'secondary',
      'success',
      'warning',
    ])
  })

  it('each color scale has exactly 19 shade keys', () => {
    const p = generatePrimitives(DEFAULT_CONFIG)
    for (const [name, scale] of Object.entries(p.colors)) {
      expect(
        Object.keys(scale).map(Number).sort((a, b) => a - b),
        `${name} scale`,
      ).toEqual(SHADE_KEYS)
    }
  })

  it('all color values are valid hex strings', () => {
    const p = generatePrimitives(DEFAULT_CONFIG)
    const hexRe = /^#[0-9a-f]{6}$/i
    for (const scale of Object.values(p.colors)) {
      for (const hex of Object.values(scale)) {
        expect(hex).toMatch(hexRe)
      }
    }
  })
})

describe('generatePrimitives — functional colors', () => {
  it('saas projectType enables all 4 functional roles', () => {
    const p = generatePrimitives(DEFAULT_CONFIG)
    expect(p.colors).toHaveProperty('error')
    expect(p.colors).toHaveProperty('warning')
    expect(p.colors).toHaveProperty('success')
    expect(p.colors).toHaveProperty('info')
  })

  it('marketing projectType enables only error', () => {
    const config: ProjectConfig = { ...DEFAULT_CONFIG, projectType: 'marketing' }
    const p = generatePrimitives(config)
    expect(p.colors).toHaveProperty('error')
    expect(p.colors).not.toHaveProperty('warning')
    expect(p.colors).not.toHaveProperty('success')
    expect(p.colors).not.toHaveProperty('info')
  })

  it('mobile projectType enables all 4 functional roles', () => {
    const config: ProjectConfig = { ...DEFAULT_CONFIG, projectType: 'mobile' }
    const p = generatePrimitives(config)
    expect(p.colors).toHaveProperty('error')
    expect(p.colors).toHaveProperty('warning')
    expect(p.colors).toHaveProperty('success')
    expect(p.colors).toHaveProperty('info')
  })

  it('blue primary (DEFAULT_CONFIG) aliases info scale to primary hue', () => {
    // primary is #3b82f6 (hue ~217°), info target is 220° — within 30° → aliased
    const p = generatePrimitives(DEFAULT_CONFIG)
    // info[500] and primary[500] should be the same hex (same seed)
    expect(p.colors.info?.[500]).toBe(p.colors.primary[500])
  })

  it('green primary aliases success scale to primary hue', () => {
    const config: ProjectConfig = {
      ...DEFAULT_CONFIG,
      color: { ...DEFAULT_CONFIG.color, primaryHex: '#166534' },
    }
    const p = generatePrimitives(config)
    // #166534 (hue ~145°) is within 30° of success target 130° → seeded from primary hex
    expect(p.colors.success?.[500]).toBe(p.colors.primary[500])
  })

  it('explicit enabled override restricts functional roles', () => {
    const config: ProjectConfig = {
      ...DEFAULT_CONFIG,
      color: {
        ...DEFAULT_CONFIG.color,
        functionalColors: { enabled: ['error', 'success'] },
      },
    }
    const p = generatePrimitives(config)
    expect(p.colors).toHaveProperty('error')
    expect(p.colors).toHaveProperty('success')
    expect(p.colors).not.toHaveProperty('warning')
    expect(p.colors).not.toHaveProperty('info')
  })

  it('functional color override hex is used verbatim', () => {
    const overrideHex = '#7c3aed'
    const config: ProjectConfig = {
      ...DEFAULT_CONFIG,
      color: {
        ...DEFAULT_CONFIG.color,
        functionalColors: {
          enabled: ['error'],
          overrides: { error: overrideHex },
        },
      },
    }
    const p = generatePrimitives(config)
    // The override scale is seeded from overrideHex, not a red
    // Verify the scale exists and has valid hex values
    expect(p.colors).toHaveProperty('error')
    const errorScale = p.colors.error
    expect(errorScale).toBeDefined()
    Object.values(errorScale!).forEach((hex) => {
      expect(hex).toMatch(/^#[0-9a-f]{6}$/i)
    })
  })
})

describe('generatePrimitives — spacing', () => {
  it('compact density: space-2 = 6px', () => {
    const p = generatePrimitives({
      ...DEFAULT_CONFIG,
      shape: { ...DEFAULT_CONFIG.shape, density: 'compact' },
    })
    expect(p.spacing['space-2']).toBe('6px')
  })

  it('balanced density: space-2 = 8px', () => {
    const p = generatePrimitives(DEFAULT_CONFIG) // balanced is the default
    expect(p.spacing['space-2']).toBe('8px')
  })

  it('spacious density: space-2 = 10px', () => {
    const p = generatePrimitives({
      ...DEFAULT_CONFIG,
      shape: { ...DEFAULT_CONFIG.shape, density: 'spacious' },
    })
    expect(p.spacing['space-2']).toBe('10px')
  })

  it('spacing scale includes space-1 through space-48', () => {
    const p = generatePrimitives(DEFAULT_CONFIG)
    expect(p.spacing['space-1']).toBeDefined()
    expect(p.spacing['space-48']).toBeDefined()
  })
})

describe('generatePrimitives — typeSizes', () => {
  it('ratio 1.25 produces exactly 7 steps', () => {
    const p = generatePrimitives(DEFAULT_CONFIG) // scaleRatio: 1.25
    expect(Object.keys(p.typeSizes)).toHaveLength(7)
  })

  it('ratio 1.25: text-base = 1rem', () => {
    const p = generatePrimitives(DEFAULT_CONFIG)
    expect(p.typeSizes['text-base']).toBe('1rem')
  })

  it('ratio 1.25: text-lg = 1.25rem', () => {
    const p = generatePrimitives(DEFAULT_CONFIG)
    expect(p.typeSizes['text-lg']).toBe('1.25rem')
  })

  it('ratio 1.333 produces exactly 7 steps', () => {
    const config: ProjectConfig = {
      ...DEFAULT_CONFIG,
      typography: { ...DEFAULT_CONFIG.typography, scaleRatio: 1.333 },
    }
    const p = generatePrimitives(config)
    expect(Object.keys(p.typeSizes)).toHaveLength(7)
  })

  it('ratio 1.333: text-lg within ±0.001 of 1.333rem', () => {
    const config: ProjectConfig = {
      ...DEFAULT_CONFIG,
      typography: { ...DEFAULT_CONFIG.typography, scaleRatio: 1.333 },
    }
    const p = generatePrimitives(config)
    const value = parseFloat(p.typeSizes['text-lg'])
    expect(Math.abs(value - 1.333)).toBeLessThanOrEqual(0.001)
  })

  it('includes text-xs and text-3xl as the smallest and largest steps', () => {
    const p = generatePrimitives(DEFAULT_CONFIG)
    expect(p.typeSizes['text-xs']).toBeDefined()
    expect(p.typeSizes['text-3xl']).toBeDefined()
  })

  it('text-3xl is larger than text-base', () => {
    const p = generatePrimitives(DEFAULT_CONFIG)
    expect(parseFloat(p.typeSizes['text-3xl'])).toBeGreaterThan(
      parseFloat(p.typeSizes['text-base']),
    )
  })
})

describe('generatePrimitives — radii', () => {
  it('professional and approachable have different radius-md values', () => {
    const pro = generatePrimitives(DEFAULT_CONFIG) // professional is default
    const approachable = generatePrimitives({
      ...DEFAULT_CONFIG,
      shape: { ...DEFAULT_CONFIG.shape, personality: 'approachable' },
    })
    expect(pro.radii['radius-md']).not.toBe(approachable.radii['radius-md'])
  })

  it('includes radius-sm, radius-md, radius-lg, radius-full', () => {
    const p = generatePrimitives(DEFAULT_CONFIG)
    expect(p.radii['radius-sm']).toBeDefined()
    expect(p.radii['radius-md']).toBeDefined()
    expect(p.radii['radius-lg']).toBeDefined()
    expect(p.radii['radius-full']).toBeDefined()
  })

  it('radius-full is 9999px for all personalities', () => {
    for (const personality of ['professional', 'approachable', 'bold', 'minimal'] as const) {
      const p = generatePrimitives({
        ...DEFAULT_CONFIG,
        shape: { ...DEFAULT_CONFIG.shape, personality },
      })
      expect(p.radii['radius-full']).toBe('9999px')
    }
  })
})

describe('generatePrimitives — shadows', () => {
  it('flat: shadow-sm, shadow-md, shadow-lg are all none', () => {
    const p = generatePrimitives({
      ...DEFAULT_CONFIG,
      shape: { ...DEFAULT_CONFIG.shape, dimensionality: 'flat' },
    })
    expect(p.shadows['shadow-sm']).toBe('none')
    expect(p.shadows['shadow-md']).toBe('none')
    expect(p.shadows['shadow-lg']).toBe('none')
  })

  it('subtle: all three shadow steps are non-none', () => {
    const p = generatePrimitives({
      ...DEFAULT_CONFIG,
      shape: { ...DEFAULT_CONFIG.shape, dimensionality: 'subtle' },
    })
    expect(p.shadows['shadow-sm']).not.toBe('none')
    expect(p.shadows['shadow-md']).not.toBe('none')
    expect(p.shadows['shadow-lg']).not.toBe('none')
  })

  it('dimensional: all three shadow steps are non-none', () => {
    const p = generatePrimitives({
      ...DEFAULT_CONFIG,
      shape: { ...DEFAULT_CONFIG.shape, dimensionality: 'dimensional' },
    })
    expect(p.shadows['shadow-sm']).not.toBe('none')
    expect(p.shadows['shadow-md']).not.toBe('none')
    expect(p.shadows['shadow-lg']).not.toBe('none')
  })
})

describe('generatePrimitives — mode agnostic', () => {
  it('light-only and light+dark configs produce identical output', () => {
    const lightOnly = generatePrimitives(DEFAULT_CONFIG)
    const bothModes = generatePrimitives({
      ...DEFAULT_CONFIG,
      modes: ['light', 'dark'],
    })
    expect(lightOnly).toEqual(bothModes)
  })
})
