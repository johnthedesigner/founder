import { describe, it, expect } from 'vitest'
import { generateReadme } from '../../../src/pipeline/docs/readme'
import { generateTokensDoc } from '../../../src/pipeline/docs/tokens-doc'
import { generateComponentsDoc } from '../../../src/pipeline/docs/components-doc'
import { generateDecisions } from '../../../src/pipeline/docs/decisions'
import { generateAgentSpec } from '../../../src/pipeline/docs/agent-spec'
import { buildComponentSpecs } from '../../../src/pipeline/docs/component-specs'
import { generatePrimitives } from '../../../src/pipeline/tokens/primitives'
import { generateSemanticTokens } from '../../../src/pipeline/tokens/semantic'
import { generateComponentTokens } from '../../../src/pipeline/tokens/component'
import { generateComponents } from '../../../src/pipeline/components/index'
import { DEFAULT_CONFIG } from '../../../src/pipeline/palette/defaults'
import type { GeneratedSystem, ProjectConfig } from '@ds-gen/types'

function buildSystem(config: ProjectConfig = DEFAULT_CONFIG): GeneratedSystem {
  const primitives = generatePrimitives(config)
  const semantic = generateSemanticTokens(primitives, config)
  const component = generateComponentTokens(semantic, config)
  const files = generateComponents(config, { semantic, component })
  const components = buildComponentSpecs(config)
  return {
    config,
    tokens: { primitives, semantic, component },
    components,
    files,
    metadata: {
      generatedAt: new Date().toISOString(),
      corrections: semantic.corrections,
    },
  }
}

describe('generateReadme', () => {
  const readme = generateReadme(buildSystem(), DEFAULT_CONFIG)

  it('produces non-empty output', () => {
    expect(readme.length).toBeGreaterThan(0)
  })

  it('contains all six required sections', () => {
    expect(readme).toContain('## What Was Generated')
    expect(readme).toContain('## Installation')
    expect(readme).toContain('## Token Usage')
    expect(readme).toContain('## Dark Mode')
    expect(readme).toContain('## Component Usage')
    expect(readme).toContain('## How to Regenerate')
  })
})

describe('generateTokensDoc', () => {
  const doc = generateTokensDoc(buildSystem())

  it('produces non-empty output', () => {
    expect(doc.length).toBeGreaterThan(0)
  })

  it('contains required semantic token names', () => {
    expect(doc).toContain('color.action.primary')
    expect(doc).toContain('color.surface.default')
    expect(doc).toContain('color.text.primary')
    expect(doc).toContain('font.family.body')
  })
})

describe('generateComponentsDoc', () => {
  const doc = generateComponentsDoc(buildSystem(), DEFAULT_CONFIG)

  it('produces non-empty output', () => {
    expect(doc.length).toBeGreaterThan(0)
  })

  it('contains sections for Button, Input, and Form Field', () => {
    expect(doc).toContain('Button')
    expect(doc).toContain('Input')
    expect(doc).toContain('Form Field')
  })
})

describe('generateDecisions', () => {
  it('contains keywords for type scale, border radius, color approach, and spacing density', () => {
    const doc = generateDecisions(DEFAULT_CONFIG)
    expect(doc).toMatch(/[Tt]ype [Ss]cale|type scale|typeStyle|scaleRatio/)
    expect(doc).toMatch(/[Bb]order [Rr]adius|border.?radius|radii/i)
    expect(doc).toMatch(/[Cc]olor|palette|hue/i)
    expect(doc).toMatch(/[Ss]pacing|density|compact|spacious/i)
  })

  it('output differs between serif-accented and geometric typeStyle', () => {
    const serifConfig: ProjectConfig = {
      ...DEFAULT_CONFIG,
      typography: { ...DEFAULT_CONFIG.typography, typeStyle: 'serif-accented' },
    }
    const geometricConfig: ProjectConfig = {
      ...DEFAULT_CONFIG,
      typography: { ...DEFAULT_CONFIG.typography, typeStyle: 'geometric' },
    }
    expect(generateDecisions(serifConfig)).not.toEqual(generateDecisions(geometricConfig))
  })
})

describe('generateAgentSpec', () => {
  const system = buildSystem()
  const raw = generateAgentSpec(system, DEFAULT_CONFIG)

  it('produces valid JSON', () => {
    expect(() => JSON.parse(raw)).not.toThrow()
  })

  it('has all required top-level keys', () => {
    const spec = JSON.parse(raw) as Record<string, unknown>
    expect(spec).toHaveProperty('version')
    expect(spec).toHaveProperty('projectId')
    expect(spec).toHaveProperty('projectName')
    expect(spec).toHaveProperty('generatedAt')
    expect(spec).toHaveProperty('config')
    expect(spec).toHaveProperty('tokens')
    expect(spec).toHaveProperty('components')
    expect(spec).toHaveProperty('rules')
  })

  it('components array contains entries for every component in DEFAULT_CONFIG scope', () => {
    const spec = JSON.parse(raw) as { components: unknown[] }
    expect(Array.isArray(spec.components)).toBe(true)
    expect(spec.components.length).toBeGreaterThan(0)
  })

  it('each component entry has required fields', () => {
    const spec = JSON.parse(raw) as { components: Record<string, unknown>[] }
    for (const c of spec.components) {
      expect(c).toHaveProperty('name')
      expect(c).toHaveProperty('variants')
      expect(c).toHaveProperty('tokenRefs')
      expect(c).toHaveProperty('accessibilityNotes')
      expect(c).toHaveProperty('usageGuidance')
    }
  })
})

describe('no forbidden words in docs', () => {
  it('no doc output contains TODO, FIXME, or placeholder', () => {
    const system = buildSystem()
    const docs = [
      generateReadme(system, DEFAULT_CONFIG),
      generateTokensDoc(system),
      generateComponentsDoc(system, DEFAULT_CONFIG),
      generateDecisions(DEFAULT_CONFIG),
      generateAgentSpec(system, DEFAULT_CONFIG),
    ]
    for (const doc of docs) {
      expect(doc).not.toContain('TODO')
      expect(doc).not.toContain('FIXME')
      expect(doc).not.toContain('placeholder')
    }
  })
})
