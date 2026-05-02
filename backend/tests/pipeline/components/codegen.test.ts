import { describe, it, expect } from 'vitest'
import { generateComponents } from '../../../src/pipeline/components/index'
import { generateSemanticTokens } from '../../../src/pipeline/tokens/semantic'
import { generatePrimitives } from '../../../src/pipeline/tokens/primitives'
import { generateComponentTokens } from '../../../src/pipeline/tokens/component'
import { DEFAULT_CONFIG } from '../../../src/pipeline/palette/defaults'
import type { ProjectConfig } from '@ds-gen/types'

const BASE_UI_IMPORT = '@base-ui-components/react'

function buildTokens(config: ProjectConfig) {
  const primitives = generatePrimitives(config)
  const semantic = generateSemanticTokens(primitives, config)
  const component = generateComponentTokens(semantic, config)
  return { semantic, component }
}

function allFiles(config = DEFAULT_CONFIG) {
  return generateComponents(config, buildTokens(config))
}

describe('generateComponents — completeness', () => {
  const files = allFiles()

  it('returns a non-empty array', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it('every file has a non-empty path and content', () => {
    for (const f of files) {
      expect(f.path.length).toBeGreaterThan(0)
      expect(f.content.length).toBeGreaterThan(0)
    }
  })

  it('produces a file for each Tier 1 component', () => {
    const paths = files.map((f) => f.path)
    const tier1 = [
      'button', 'input', 'select', 'checkbox', 'radio', 'switch',
      'dialog', 'tooltip', 'popover', 'tabs', 'menu', 'slider',
    ]
    for (const name of tier1) {
      expect(
        paths.some((p) => p.includes(`/${name}/`)),
        `no file for ${name}`,
      ).toBe(true)
    }
  })

  it('produces a file for each Tier 2 component', () => {
    const paths = files.map((f) => f.path)
    for (const name of ['form-field', 'card', 'badge', 'alert', 'avatar']) {
      expect(
        paths.some((p) => p.includes(`/${name}/`)),
        `no file for ${name}`,
      ).toBe(true)
    }
  })
})

describe('generateComponents — Button content', () => {
  // Combine tsx + types file so union type strings ('secondary' etc.) are included
  const btnContent = allFiles()
    .filter((f) => f.path.includes('/button/'))
    .map((f) => f.content)
    .join('\n')

  it('Button files exist', () => {
    expect(btnContent.length).toBeGreaterThan(0)
  })

  it("contains all four variant strings", () => {
    expect(btnContent).toContain("'primary'")
    expect(btnContent).toContain("'secondary'")
    expect(btnContent).toContain("'ghost'")
    expect(btnContent).toContain("'destructive'")
  })

  it("contains all three size strings", () => {
    expect(btnContent).toContain("'sm'")
    expect(btnContent).toContain("'md'")
    expect(btnContent).toContain("'lg'")
  })

  it('contains focus-visible', () => {
    expect(btnContent).toContain('focus-visible')
  })

  it('contains no primitive token names (e.g. color.blue.600)', () => {
    expect(btnContent).not.toMatch(/color\.\w+\.\d+/)
  })
})

// Card, badge, alert, avatar have no Base UI primitive equivalent — they are styled HTML
const PURE_HTML_COMPONENTS = ['card', 'badge', 'alert', 'avatar']

describe('generateComponents — Base UI imports', () => {
  it('every interactive TSX file contains a Base UI import', () => {
    const tsxFiles = allFiles().filter(
      (f) =>
        f.path.endsWith('.tsx') &&
        !PURE_HTML_COMPONENTS.some((name) => f.path.includes(`/${name}/`)),
    )
    for (const f of tsxFiles) {
      expect(
        f.content.includes(BASE_UI_IMPORT),
        `${f.path} missing Base UI import`,
      ).toBe(true)
    }
  })
})

describe('generateComponents — content quality', () => {
  it('no file contains TODO, FIXME, placeholder, or console.log', () => {
    for (const f of allFiles()) {
      expect(f.content, `${f.path} contains TODO`).not.toContain('TODO')
      expect(f.content, `${f.path} contains FIXME`).not.toContain('FIXME')
      expect(f.content, `${f.path} contains placeholder`).not.toContain('placeholder')
      expect(f.content, `${f.path} contains console.log`).not.toContain('console.log')
    }
  })
})

describe('generateComponents — scope filtering', () => {
  it('forms-only scope excludes navigation components', () => {
    const formsConfig: ProjectConfig = {
      ...DEFAULT_CONFIG,
      componentScope: ['forms'],
    }
    const files = generateComponents(formsConfig, buildTokens(formsConfig))
    const paths = files.map((f) => f.path)
    expect(paths.some((p) => p.includes('/tabs/'))).toBe(false)
    expect(paths.some((p) => p.includes('/menu/'))).toBe(false)
  })

  it('forms-only scope still includes button and input', () => {
    const formsConfig: ProjectConfig = {
      ...DEFAULT_CONFIG,
      componentScope: ['forms'],
    }
    const files = generateComponents(formsConfig, buildTokens(formsConfig))
    const paths = files.map((f) => f.path)
    expect(paths.some((p) => p.includes('/button/'))).toBe(true)
    expect(paths.some((p) => p.includes('/input/'))).toBe(true)
  })

  it('overlays-only scope excludes forms components', () => {
    const overlaysConfig: ProjectConfig = {
      ...DEFAULT_CONFIG,
      componentScope: ['overlays'],
    }
    const files = generateComponents(overlaysConfig, buildTokens(overlaysConfig))
    const paths = files.map((f) => f.path)
    expect(paths.some((p) => p.includes('/button/'))).toBe(false)
    expect(paths.some((p) => p.includes('/dialog/'))).toBe(true)
  })
})
