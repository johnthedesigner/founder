import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { generate } from '../../src/pipeline/index'
import { contrastRatio } from '../../src/pipeline/tokens/accessibility'
import { DEFAULT_CONFIG } from '../../src/pipeline/palette/defaults'
import type { ProjectConfig } from '@ds-gen/types'

const REQUIRED_PATHS = [
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

const WCAG_TEXT_PAIRS = [
  { fg: 'color.action.primary.fg', bg: 'color.action.primary' },
  { fg: 'color.action.secondary.fg', bg: 'color.action.secondary' },
  { fg: 'color.action.destructive.fg', bg: 'color.action.destructive' },
  { fg: 'color.text.primary', bg: 'color.surface.default' },
  { fg: 'color.text.secondary', bg: 'color.surface.default' },
  { fg: 'color.text.on-action', bg: 'color.action.primary' },
]

// ---- basic output shape ----

describe('generate — output shape', () => {
  const system = generate(DEFAULT_CONFIG)

  it('returns without throwing', () => {
    expect(system).toBeDefined()
  })

  it('files array contains all required paths', () => {
    const paths = system.files.map((f) => f.path)
    for (const required of REQUIRED_PATHS) {
      expect(paths, `missing: ${required}`).toContain(required)
    }
  })

  it('all three W3C JSON token files parse as JSON', () => {
    const jsonPaths = ['tokens/primitives.json', 'tokens/semantic.json', 'tokens/component.json']
    const fileMap = Object.fromEntries(system.files.map((f) => [f.path, f.content]))
    for (const p of jsonPaths) {
      expect(() => JSON.parse(fileMap[p]!), `${p} is not valid JSON`).not.toThrow()
    }
  })

  it('W3C JSON files contain $value and $type keys', () => {
    const fileMap = Object.fromEntries(system.files.map((f) => [f.path, f.content]))
    for (const p of ['tokens/primitives.json', 'tokens/semantic.json', 'tokens/component.json']) {
      const raw = fileMap[p]!
      expect(raw, `${p} missing $value`).toContain('"$value"')
      expect(raw, `${p} missing $type`).toContain('"$type"')
    }
  })

  it('tokens/variables.css contains a :root { block', () => {
    const css = system.files.find((f) => f.path === 'tokens/variables.css')!.content
    expect(css).toContain(':root {')
  })

  it('tokens/variables.css contains --color-action-primary', () => {
    const css = system.files.find((f) => f.path === 'tokens/variables.css')!.content
    expect(css).toContain('--color-action-primary')
  })

  it('docs/agent-spec.json parses as valid JSON with all required top-level keys', () => {
    const raw = system.files.find((f) => f.path === 'docs/agent-spec.json')!.content
    const spec = JSON.parse(raw) as Record<string, unknown>
    for (const key of ['version', 'projectId', 'projectName', 'generatedAt', 'config', 'tokens', 'components', 'rules']) {
      expect(spec, `agent-spec missing key: ${key}`).toHaveProperty(key)
    }
  })

  it('.design-system-meta.json parses and contains required fields', () => {
    const raw = system.files.find((f) => f.path === '.design-system-meta.json')!.content
    const meta = JSON.parse(raw) as Record<string, unknown>
    expect(meta).toHaveProperty('version')
    expect(meta).toHaveProperty('projectId')
    expect(meta).toHaveProperty('generatedAt')
    expect(meta).toHaveProperty('config')
  })

  it('no file content contains TODO, FIXME, or console.log', () => {
    for (const f of system.files) {
      expect(f.content, `${f.path} contains TODO`).not.toContain('TODO')
      expect(f.content, `${f.path} contains FIXME`).not.toContain('FIXME')
      expect(f.content, `${f.path} contains console.log`).not.toContain('console.log')
    }
  })

  it('no code file contains placeholder (Tailwind placeholder: variant)', () => {
    // JSON token files may legitimately contain "placeholder" as a token key
    const codeFiles = system.files.filter(
      (f) => f.path.endsWith('.tsx') || f.path.endsWith('.ts') || f.path.endsWith('.md'),
    )
    for (const f of codeFiles) {
      expect(f.content, `${f.path} contains placeholder`).not.toContain('placeholder')
    }
  })
})

// ---- WCAG contrast ----

describe('generate — WCAG contrast', () => {
  it('all light-mode semantic foreground/background pairs meet 4.5:1', () => {
    const system = generate(DEFAULT_CONFIG)
    const colorMap: Record<string, string> = {}
    for (const [key, val] of Object.entries(system.tokens.semantic.colors)) {
      colorMap[key] = val.light
    }
    for (const pair of WCAG_TEXT_PAIRS) {
      const fg = colorMap[pair.fg]
      const bg = colorMap[pair.bg]
      if (!fg || !bg) continue
      const ratio = contrastRatio(fg, bg)
      expect(ratio, `${pair.fg} on ${pair.bg}: ${ratio.toFixed(2)} < 4.5`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('dark mode pairs meet 4.5:1 when dark mode is enabled', () => {
    const darkConfig: ProjectConfig = { ...DEFAULT_CONFIG, modes: ['light', 'dark'] }
    const system = generate(darkConfig)
    const colorMap: Record<string, string> = {}
    for (const [key, val] of Object.entries(system.tokens.semantic.colors)) {
      colorMap[key] = val.dark ?? val.light
    }
    for (const pair of WCAG_TEXT_PAIRS) {
      const fg = colorMap[pair.fg]
      const bg = colorMap[pair.bg]
      if (!fg || !bg) continue
      const ratio = contrastRatio(fg, bg)
      expect(ratio, `dark ${pair.fg} on ${pair.bg}: ${ratio.toFixed(2)} < 4.5`).toBeGreaterThanOrEqual(4.5)
    }
  })
})

// ---- performance ----

describe('generate — performance', () => {
  it('DEFAULT_CONFIG completes in under 200ms', () => {
    const start = performance.now()
    generate(DEFAULT_CONFIG)
    const elapsed = performance.now() - start
    expect(elapsed, `took ${elapsed.toFixed(0)}ms`).toBeLessThan(200)
  })

  it('full config (all scopes + dark mode) completes in under 200ms', () => {
    const fullConfig: ProjectConfig = {
      ...DEFAULT_CONFIG,
      componentScope: ['forms', 'navigation', 'overlays', 'feedback', 'data-display', 'layout'],
      modes: ['light', 'dark'],
    }
    const start = performance.now()
    generate(fullConfig)
    const elapsed = performance.now() - start
    expect(elapsed, `took ${elapsed.toFixed(0)}ms`).toBeLessThan(200)
  })
})

// ---- determinism ----

describe('generate — determinism', () => {
  it('two calls with identical config and same timestamp produce identical file contents', () => {
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    const a = generate(DEFAULT_CONFIG)
    const b = generate(DEFAULT_CONFIG)
    vi.useRealTimers()
    const aMap = Object.fromEntries(a.files.map((f) => [f.path, f.content]))
    const bMap = Object.fromEntries(b.files.map((f) => [f.path, f.content]))
    for (const path of REQUIRED_PATHS) {
      expect(aMap[path], `${path} differs between runs`).toEqual(bMap[path])
    }
  })
})

// ---- parameterized correctness ----

describe('generate — parameterized correctness', () => {
  const typeStyles = ['geometric', 'humanist', 'serif-accented', 'monospace-accented'] as const
  const densities = ['compact', 'balanced', 'spacious'] as const

  for (const typeStyle of typeStyles) {
    it(`runs without error for typeStyle="${typeStyle}"`, () => {
      const config: ProjectConfig = {
        ...DEFAULT_CONFIG,
        typography: { ...DEFAULT_CONFIG.typography, typeStyle },
      }
      expect(() => generate(config)).not.toThrow()
    })
  }

  for (const density of densities) {
    it(`runs without error for density="${density}"`, () => {
      const config: ProjectConfig = {
        ...DEFAULT_CONFIG,
        shape: { ...DEFAULT_CONFIG.shape, density },
      }
      expect(() => generate(config)).not.toThrow()
    })
  }

  it('runs without error for colorSource="provided" with a valid hex', () => {
    const config: ProjectConfig = {
      ...DEFAULT_CONFIG,
      color: { ...DEFAULT_CONFIG.color, source: 'provided', primaryHex: '#e63946' },
    }
    expect(() => generate(config)).not.toThrow()
  })

  it('runs without error for colorSource="generated"', () => {
    const config: ProjectConfig = {
      ...DEFAULT_CONFIG,
      color: { ...DEFAULT_CONFIG.color, source: 'generated' },
    }
    expect(() => generate(config)).not.toThrow()
  })
})

// ---- no side effects ----

describe('generate — no side effects', () => {
  it('does not call console.log', () => {
    const spy = vi.spyOn(console, 'log')
    generate(DEFAULT_CONFIG)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})

// ---- TypeScript compilation of generated output ----

const workspaceRoot = resolve(process.cwd(), '..')
const tscBin = resolve(workspaceRoot, 'node_modules/.bin/tsc')
const integrationOutputDir = resolve(process.cwd(), 'tests/_gen_integration')

beforeAll(() => {
  const system = generate(DEFAULT_CONFIG)
  rmSync(integrationOutputDir, { recursive: true, force: true })
  mkdirSync(integrationOutputDir, { recursive: true })

  for (const file of system.files) {
    const fullPath = resolve(integrationOutputDir, file.path)
    mkdirSync(dirname(fullPath), { recursive: true })
    writeFileSync(fullPath, file.content, 'utf-8')
  }

  const tsconfig = JSON.stringify(
    {
      compilerOptions: {
        target: 'ESNext',
        lib: ['ES2020', 'DOM'],
        module: 'ESNext',
        moduleResolution: 'bundler',
        jsx: 'react-jsx',
        strict: true,
        skipLibCheck: true,
        noEmit: true,
        esModuleInterop: true,
      },
      include: ['components/**/*.tsx', 'components/**/*.ts'],
      exclude: ['tokens/tailwind.config.ts'],
    },
    null,
    2,
  )
  writeFileSync(resolve(integrationOutputDir, 'tsconfig.json'), tsconfig, 'utf-8')

  const tailwindTsconfig = JSON.stringify(
    {
      compilerOptions: {
        target: 'ESNext',
        module: 'ESNext',
        moduleResolution: 'bundler',
        strict: true,
        skipLibCheck: true,
        noEmit: true,
      },
      include: ['tokens/tailwind.config.ts'],
    },
    null,
    2,
  )
  writeFileSync(resolve(integrationOutputDir, 'tsconfig.tailwind.json'), tailwindTsconfig, 'utf-8')
})

afterAll(() => {
  rmSync(integrationOutputDir, { recursive: true, force: true })
})

describe('generate — TypeScript compilation', () => {
  it('tsc binary exists', () => {
    expect(existsSync(tscBin)).toBe(true)
  })

  it('all component .tsx files compile with zero errors', () => {
    let stdout = ''
    let exitCode = 0
    try {
      stdout = execSync(`"${tscBin}" --noEmit --project tsconfig.json`, {
        cwd: integrationOutputDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      })
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; status?: number }
      stdout = (e.stdout ?? '') + (e.stderr ?? '')
      exitCode = e.status ?? 1
    }
    expect(exitCode, `TypeScript errors:\n${stdout}`).toBe(0)
  })

  it('tokens/tailwind.config.ts compiles with zero errors', () => {
    let stdout = ''
    let exitCode = 0
    try {
      stdout = execSync(`"${tscBin}" --noEmit --project tsconfig.tailwind.json`, {
        cwd: integrationOutputDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      })
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; status?: number }
      stdout = (e.stdout ?? '') + (e.stderr ?? '')
      exitCode = e.status ?? 1
    }
    expect(exitCode, `TypeScript errors:\n${stdout}`).toBe(0)
  })
})
