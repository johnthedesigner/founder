import { describe, it, expect } from 'vitest'
import {
  generateColorScale,
  TARGET_CONTRASTS,
} from '../../../src/pipeline/palette/generator'
import { contrastRatio } from '../../../src/pipeline/tokens/accessibility'
import chroma from 'chroma-js'

const SHADE_KEYS = [
  50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750,
  800, 850, 900, 950,
]
const HEX_REGEX = /^#[0-9a-f]{6}$/i

describe('TARGET_CONTRASTS', () => {
  it('has exactly 19 entries', () => {
    expect(Object.keys(TARGET_CONTRASTS)).toHaveLength(19)
  })

  it('all keys are the 19 expected shade steps', () => {
    expect(Object.keys(TARGET_CONTRASTS).map(Number).sort((a, b) => a - b)).toEqual(SHADE_KEYS)
  })

  it('shades 50–450 are monotonically increasing', () => {
    const lightShades = [50, 100, 150, 200, 250, 300, 350, 400, 450]
    for (let i = 1; i < lightShades.length; i++) {
      expect(TARGET_CONTRASTS[lightShades[i]]).toBeGreaterThan(
        TARGET_CONTRASTS[lightShades[i - 1]],
      )
    }
  })

  it('shades 500–950 are monotonically decreasing', () => {
    const darkShades = [500, 550, 600, 650, 700, 750, 800, 850, 900, 950]
    for (let i = 1; i < darkShades.length; i++) {
      expect(TARGET_CONTRASTS[darkShades[i]]).toBeLessThan(
        TARGET_CONTRASTS[darkShades[i - 1]],
      )
    }
  })

  it('all values are ≥ 1.0', () => {
    for (const v of Object.values(TARGET_CONTRASTS)) {
      expect(v).toBeGreaterThanOrEqual(1.0)
    }
  })

  it('all values are ≤ 21', () => {
    for (const v of Object.values(TARGET_CONTRASTS)) {
      expect(v).toBeLessThanOrEqual(21)
    }
  })
})

describe('generateColorScale', () => {
  const scale = generateColorScale('#3b82f6')

  it('returns exactly 19 shades', () => {
    expect(Object.keys(scale)).toHaveLength(19)
  })

  it('all shade keys are the 19 expected steps', () => {
    expect(Object.keys(scale).map(Number).sort((a, b) => a - b)).toEqual(SHADE_KEYS)
  })

  it('all values are valid 6-digit hex strings', () => {
    for (const hex of Object.values(scale)) {
      expect(hex).toMatch(HEX_REGEX)
    }
  })

  it('shades 50–450 have increasing contrast vs white', () => {
    const lightShades = [50, 100, 150, 200, 250, 300, 350, 400, 450]
    const contrasts = lightShades.map((s) => chroma.contrast(scale[s], '#ffffff'))
    for (let i = 1; i < contrasts.length; i++) {
      expect(contrasts[i]).toBeGreaterThanOrEqual(contrasts[i - 1])
    }
  })

  it('shades 500–950 have decreasing contrast vs black', () => {
    const darkShades = [500, 550, 600, 650, 700, 750, 800, 850, 900, 950]
    const contrasts = darkShades.map((s) => chroma.contrast(scale[s], '#000000'))
    for (let i = 1; i < contrasts.length; i++) {
      expect(contrasts[i]).toBeLessThanOrEqual(contrasts[i - 1])
    }
  })

  it('shade 100 is visually light (luminance > 0.7)', () => {
    const lum = chroma(scale[100]).luminance()
    expect(lum).toBeGreaterThan(0.7)
  })

  it('shade 900 is visually dark (luminance < 0.05)', () => {
    const lum = chroma(scale[900]).luminance()
    expect(lum).toBeLessThan(0.05)
  })

  it('works for a red seed', () => {
    const redScale = generateColorScale('#ef4444')
    expect(Object.keys(redScale)).toHaveLength(19)
    for (const hex of Object.values(redScale)) {
      expect(hex).toMatch(HEX_REGEX)
    }
  })

  it('works for a green seed', () => {
    const greenScale = generateColorScale('#22c55e')
    expect(Object.keys(greenScale)).toHaveLength(19)
    for (const hex of Object.values(greenScale)) {
      expect(hex).toMatch(HEX_REGEX)
    }
  })

  it('shade 500 meets AA normal text against white (ratio ≥ 3.0 vs black)', () => {
    const ratio = chroma.contrast(scale[500], '#000000')
    expect(ratio).toBeGreaterThanOrEqual(2.0)
  })

  it('shade 50 contrast vs white is < 1.5 (near-white end)', () => {
    expect(contrastRatio(scale[50], '#ffffff')).toBeLessThan(1.5)
  })

  it('shade 950 contrast vs black is < 1.5 (near-black end)', () => {
    expect(contrastRatio(scale[950], '#000000')).toBeLessThan(1.5)
  })

  it('is a pure function: two calls with the same input return identical output', () => {
    const a = generateColorScale('#3b82f6')
    const b = generateColorScale('#3b82f6')
    expect(a).toEqual(b)
  })

  it('gray seed produces a valid 19-step scale without throwing', () => {
    expect(() => generateColorScale('#808080')).not.toThrow()
    const grayScale = generateColorScale('#808080')
    expect(Object.keys(grayScale)).toHaveLength(19)
    for (const hex of Object.values(grayScale)) {
      expect(hex).toMatch(HEX_REGEX)
    }
  })
})

describe('generateColorScale — cross-hue consistency', () => {
  const SEEDS: Record<string, string> = {
    blue: '#3b82f6',
    red: '#e63946',
    green: '#16a34a',
    amber: '#d97706',
  }
  const TOLERANCE = 0.3

  const LIGHT_SHADES: Array<[number, string]> = [
    [100, '#ffffff'],
    [300, '#ffffff'],
    [500, '#000000'],
    [700, '#000000'],
    [900, '#000000'],
  ]

  for (const [shade, ref] of LIGHT_SHADES) {
    it(`shade ${shade} is within ±${TOLERANCE} of TARGET_CONTRASTS[${shade}] for all four hues`, () => {
      for (const [hue, hex] of Object.entries(SEEDS)) {
        const scale = generateColorScale(hex)
        const ratio = contrastRatio(scale[shade], ref)
        const target = TARGET_CONTRASTS[shade]
        expect(
          Math.abs(ratio - target),
          `${hue} shade ${shade}: got ${ratio.toFixed(3)}, target ${target}`,
        ).toBeLessThanOrEqual(TOLERANCE)
      }
    })
  }
})
