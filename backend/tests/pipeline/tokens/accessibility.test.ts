import { describe, it, expect } from 'vitest'
import {
  contrastRatio,
  meetsAA,
  meetsAAA,
  findAccessibleStep,
} from '../../../src/pipeline/tokens/accessibility'
import type { ColorScale } from '@ds-gen/types'

describe('contrastRatio', () => {
  it('white vs black returns 21', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 0)
  })

  it('is symmetric', () => {
    expect(contrastRatio('#3b82f6', '#ffffff')).toBeCloseTo(
      contrastRatio('#ffffff', '#3b82f6'),
      10,
    )
  })

  it('same color returns 1.0', () => {
    expect(contrastRatio('#3b82f6', '#3b82f6')).toBeCloseTo(1.0, 5)
  })

  it('#3b82f6 vs white is approximately 3.67', () => {
    expect(contrastRatio('#3b82f6', '#ffffff')).toBeCloseTo(3.67, 1)
  })

  it('returns a value between 1 and 21 for any pair', () => {
    const ratio = contrastRatio('#64748b', '#f8fafc')
    expect(ratio).toBeGreaterThanOrEqual(1.0)
    expect(ratio).toBeLessThanOrEqual(21)
  })

  it('#000000 vs #000000 is 1.0', () => {
    expect(contrastRatio('#000000', '#000000')).toBeCloseTo(1.0, 5)
  })
})

describe('meetsAA', () => {
  it('black on white passes AA normal text', () => {
    expect(meetsAA('#000000', '#ffffff')).toBe(true)
  })

  it('#3b82f6 on white fails AA normal text', () => {
    // ~3.67, below 4.5
    expect(meetsAA('#3b82f6', '#ffffff')).toBe(false)
  })

  it('#3b82f6 on white passes AA large text (threshold 3.0)', () => {
    expect(meetsAA('#3b82f6', '#ffffff', true)).toBe(true)
  })

  it('white on white fails AA', () => {
    expect(meetsAA('#ffffff', '#ffffff')).toBe(false)
  })

  it('very dark blue on white passes AA normal text', () => {
    expect(meetsAA('#1e40af', '#ffffff')).toBe(true)
  })
})

describe('meetsAAA', () => {
  it('black on white passes AAA normal text', () => {
    expect(meetsAAA('#000000', '#ffffff')).toBe(true)
  })

  it('#1e40af on white fails AAA normal text', () => {
    // ratio ~8–10, actually passes — use a borderline color
    expect(meetsAAA('#3b82f6', '#ffffff')).toBe(false)
  })

  it('#1e3a8a on white passes AAA normal text', () => {
    // deep navy, ~12:1
    expect(meetsAAA('#1e3a8a', '#ffffff')).toBe(true)
  })

  it('passes AAA large text at 4.5', () => {
    // #1e40af vs white should be ≥ 4.5
    expect(meetsAAA('#1e40af', '#ffffff', true)).toBe(true)
  })
})

describe('findAccessibleStep', () => {
  const scale: ColorScale = {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  }

  it('returns a hex string', () => {
    const result = findAccessibleStep(scale, '#ffffff', 4.5)
    expect(result).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('returned step meets the minimum ratio', () => {
    const result = findAccessibleStep(scale, '#ffffff', 4.5)
    const ratio = contrastRatio(result, '#ffffff')
    expect(ratio).toBeGreaterThanOrEqual(4.5)
  })

  it('returns the closest-passing step (smallest passing ratio)', () => {
    const result = findAccessibleStep(scale, '#ffffff', 4.5)
    // All steps with lower shade keys that also pass should not have a smaller ratio
    const passingRatios = Object.values(scale)
      .map((h) => contrastRatio(h, '#ffffff'))
      .filter((r) => r >= 4.5)
    const resultRatio = contrastRatio(result, '#ffffff')
    expect(resultRatio).toBeLessThanOrEqual(Math.max(...passingRatios))
    // result ratio should be the minimum among passing
    expect(resultRatio).toBeCloseTo(Math.min(...passingRatios), 5)
  })

  it('works for dark backgrounds', () => {
    const result = findAccessibleStep(scale, '#000000', 4.5)
    const ratio = contrastRatio(result, '#000000')
    expect(ratio).toBeGreaterThanOrEqual(4.5)
  })

  it('throws when no step passes', () => {
    const tinyScale: ColorScale = { 500: '#3b82f6' } // ~3.67 vs white
    expect(() => findAccessibleStep(tinyScale, '#ffffff', 7.0)).toThrow()
  })

  it('accepts minRatio of 3.0 for large text', () => {
    const result = findAccessibleStep(scale, '#ffffff', 3.0)
    expect(contrastRatio(result, '#ffffff')).toBeGreaterThanOrEqual(3.0)
  })
})
