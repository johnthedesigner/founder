import { describe, it, expect } from 'vitest'
import { ProjectConfigSchema } from '@ds-gen/types'
import { DEFAULT_CONFIG, SAFE_DEFAULT_PRIMARIES } from '../../src/pipeline/palette/defaults'

describe('DEFAULT_CONFIG', () => {
  it('passes Zod schema validation', () => {
    expect(() => ProjectConfigSchema.parse(DEFAULT_CONFIG)).not.toThrow()
  })

  it('has primaryHex #3b82f6', () => {
    expect(DEFAULT_CONFIG.color.primaryHex).toBe('#3b82f6')
  })

  it('has all required top-level fields with correct types', () => {
    expect(typeof DEFAULT_CONFIG.projectType).toBe('string')
    expect(Array.isArray(DEFAULT_CONFIG.componentScope)).toBe(true)
    expect(Array.isArray(DEFAULT_CONFIG.modes)).toBe(true)
    expect(typeof DEFAULT_CONFIG.color).toBe('object')
    expect(typeof DEFAULT_CONFIG.typography).toBe('object')
    expect(typeof DEFAULT_CONFIG.shape).toBe('object')
  })

  it('includes all six component categories', () => {
    expect(DEFAULT_CONFIG.componentScope).toHaveLength(6)
    expect(DEFAULT_CONFIG.componentScope).toContain('forms')
    expect(DEFAULT_CONFIG.componentScope).toContain('navigation')
    expect(DEFAULT_CONFIG.componentScope).toContain('overlays')
    expect(DEFAULT_CONFIG.componentScope).toContain('feedback')
    expect(DEFAULT_CONFIG.componentScope).toContain('data-display')
    expect(DEFAULT_CONFIG.componentScope).toContain('layout')
  })

  it('defaults to light mode only', () => {
    expect(DEFAULT_CONFIG.modes).toEqual(['light'])
  })

  it('Zod parse returns an object equal to the input', () => {
    const parsed = ProjectConfigSchema.parse(DEFAULT_CONFIG)
    expect(parsed).toEqual(DEFAULT_CONFIG)
  })
})

describe('SAFE_DEFAULT_PRIMARIES', () => {
  const hexRegex = /^#[0-9a-f]{6}$/i

  it('has exactly 8 members', () => {
    expect(SAFE_DEFAULT_PRIMARIES).toHaveLength(8)
  })

  it('all members are valid 6-digit hex strings', () => {
    for (const color of SAFE_DEFAULT_PRIMARIES) {
      expect(color).toMatch(hexRegex)
    }
  })

  it('includes the DEFAULT_CONFIG primary color', () => {
    expect(SAFE_DEFAULT_PRIMARIES).toContain(DEFAULT_CONFIG.color.primaryHex)
  })

  it('has no duplicates', () => {
    const unique = new Set(SAFE_DEFAULT_PRIMARIES)
    expect(unique.size).toBe(SAFE_DEFAULT_PRIMARIES.length)
  })
})
