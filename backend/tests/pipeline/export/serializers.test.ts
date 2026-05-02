import { describe, it, expect } from 'vitest'
import { serializeToW3C } from '../../../src/pipeline/export/w3c'
import { serializeToCSS } from '../../../src/pipeline/export/css'
import { serializeToTailwind } from '../../../src/pipeline/export/tailwind'
import { assembleZip } from '../../../src/pipeline/export/zip'
import { generatePrimitives } from '../../../src/pipeline/tokens/primitives'
import { generateSemanticTokens } from '../../../src/pipeline/tokens/semantic'
import { generateComponentTokens } from '../../../src/pipeline/tokens/component'
import { DEFAULT_CONFIG } from '../../../src/pipeline/palette/defaults'
import type { TokenSet, ProjectConfig } from '@ds-gen/types'
import JSZip from 'jszip'

const primitives = generatePrimitives(DEFAULT_CONFIG)
const semantic = generateSemanticTokens(primitives, DEFAULT_CONFIG)
const component = generateComponentTokens(semantic, DEFAULT_CONFIG)

describe('serializeToW3C', () => {
  it('produces valid JSON from a spacing token set', () => {
    const w3c = serializeToW3C(primitives.spacing as unknown as TokenSet)
    expect(() => JSON.parse(w3c)).not.toThrow()
  })

  it('spacing tokens have $value and $type keys', () => {
    const parsed = JSON.parse(serializeToW3C(primitives.spacing as unknown as TokenSet)) as Record<
      string,
      Record<string, unknown>
    >
    const firstEntry = Object.values(parsed)[0]!
    expect(firstEntry).toHaveProperty('$value')
    expect(firstEntry).toHaveProperty('$type')
  })

  it('component tokens use {path.to.token} alias reference syntax', () => {
    const w3c = serializeToW3C(component as unknown as TokenSet)
    expect(w3c).toMatch(/\{[\w.-]+\}/)
  })

  it('produces valid JSON from the full component token set', () => {
    const w3c = serializeToW3C(component as unknown as TokenSet)
    expect(() => JSON.parse(w3c)).not.toThrow()
  })

  it('produces valid JSON from the semantic color token set', () => {
    const w3c = serializeToW3C(semantic.colors as unknown as TokenSet)
    expect(() => JSON.parse(w3c)).not.toThrow()
  })

  it('semantic color tokens contain $value and $type on leaf entries', () => {
    const parsed = JSON.parse(
      serializeToW3C(semantic.colors as unknown as TokenSet),
    ) as Record<string, Record<string, Record<string, Record<string, unknown>>>>
    // "color.action.primary" → nested as parsed.color.action.primary
    const leaf = parsed['color']?.['action']?.['primary']
    expect(leaf).toBeDefined()
    expect(leaf).toHaveProperty('$value')
    expect(leaf).toHaveProperty('$type')
  })
})

describe('serializeToCSS', () => {
  it('contains a :root { block', () => {
    const css = serializeToCSS(semantic, component, DEFAULT_CONFIG.modes)
    expect(css).toContain(':root {')
  })

  it('contains --color-action-primary', () => {
    const css = serializeToCSS(semantic, component, DEFAULT_CONFIG.modes)
    expect(css).toContain('--color-action-primary')
  })

  it('single light-mode config does not contain [data-theme="dark"]', () => {
    const css = serializeToCSS(semantic, component, ['light'])
    expect(css).not.toContain('[data-theme="dark"]')
  })

  it('dual-mode config contains [data-theme="dark"] with different values', () => {
    const darkConfig: ProjectConfig = {
      ...DEFAULT_CONFIG,
      modes: ['light', 'dark'],
    }
    const darkPrimitives = generatePrimitives(darkConfig)
    const darkSemantic = generateSemanticTokens(darkPrimitives, darkConfig)
    const darkComponent = generateComponentTokens(darkSemantic, darkConfig)
    const css = serializeToCSS(darkSemantic, darkComponent, darkConfig.modes)
    expect(css).toContain('[data-theme="dark"]')
    // Dark block must have at least one custom property with a different value
    const rootMatch = css.match(/:root \{([^}]+)\}/)
    const darkMatch = css.match(/\[data-theme="dark"\] \{([^}]+)\}/)
    expect(rootMatch).not.toBeNull()
    expect(darkMatch).not.toBeNull()
    expect(rootMatch![1]).not.toEqual(darkMatch![1])
  })

  it('includes component token custom properties', () => {
    const css = serializeToCSS(semantic, component, DEFAULT_CONFIG.modes)
    expect(css).toContain('--button-')
  })
})

describe('serializeToTailwind', () => {
  const tw = serializeToTailwind(semantic)

  it('starts with import type { Config } from tailwindcss', () => {
    expect(tw.trimStart()).toMatch(/^import type \{ Config \} from 'tailwindcss'/)
  })

  it('contains extend.colors with CSS variable references', () => {
    expect(tw).toContain('var(--color-')
  })

  it('contains extend.fontFamily', () => {
    expect(tw).toContain('fontFamily')
  })

  it('contains extend.spacing', () => {
    expect(tw).toContain('spacing')
  })

  it('ends with export default config', () => {
    expect(tw.trimEnd()).toMatch(/export default config\s*$/)
  })
})

describe('assembleZip', () => {
  const ALL_PATHS = [
    'tokens/primitives.json',
    'tokens/semantic.json',
    'tokens/component.json',
    'tokens/variables.css',
    'tokens/tailwind.config.ts',
    'components/index.ts',
    'docs/README.md',
    'docs/tokens.md',
    'docs/components.md',
    'docs/decisions.md',
    'docs/agent-spec.json',
    '.design-system-meta.json',
  ]

  const files = ALL_PATHS.map((path) => ({ path, content: `// ${path}` }))

  it('returns a Buffer', async () => {
    const buf = await assembleZip(files)
    expect(buf).toBeInstanceOf(Buffer)
    expect(buf.length).toBeGreaterThan(0)
  })

  it('ZIP contains all expected paths', async () => {
    const buf = await assembleZip(files)
    const reparsed = await JSZip.loadAsync(buf)
    const zipPaths = Object.keys(reparsed.files)
    for (const expectedPath of ALL_PATHS) {
      expect(zipPaths, `missing: ${expectedPath}`).toContain(expectedPath)
    }
  })

  it('ZIP passes integrity check (re-parseable by jszip)', async () => {
    const buf = await assembleZip(files)
    await expect(JSZip.loadAsync(buf)).resolves.not.toThrow()
  })

  it('file contents are preserved in the ZIP', async () => {
    const buf = await assembleZip(files)
    const reparsed = await JSZip.loadAsync(buf)
    const content = await reparsed.file('docs/README.md')!.async('string')
    expect(content).toBe('// docs/README.md')
  })
})
