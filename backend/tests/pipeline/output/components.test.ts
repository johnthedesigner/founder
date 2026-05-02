import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { generateComponents } from '../../../src/pipeline/components/index'
import { generateSemanticTokens } from '../../../src/pipeline/tokens/semantic'
import { generatePrimitives } from '../../../src/pipeline/tokens/primitives'
import { generateComponentTokens } from '../../../src/pipeline/tokens/component'
import { DEFAULT_CONFIG } from '../../../src/pipeline/palette/defaults'

// Workspace root is one level above the backend/ directory
const workspaceRoot = resolve(process.cwd(), '..')
const tscBin = resolve(workspaceRoot, 'node_modules/.bin/tsc')
const outputDir = resolve(process.cwd(), 'tests/_gen_output')

const TSCONFIG = JSON.stringify(
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
    include: ['./**/*.tsx', './**/*.ts'],
  },
  null,
  2,
)

beforeAll(() => {
  // Build generated files
  const primitives = generatePrimitives(DEFAULT_CONFIG)
  const semantic = generateSemanticTokens(primitives, DEFAULT_CONFIG)
  const component = generateComponentTokens(semantic, DEFAULT_CONFIG)
  const files = generateComponents(DEFAULT_CONFIG, { semantic, component })

  // Write to output dir
  rmSync(outputDir, { recursive: true, force: true })
  mkdirSync(outputDir, { recursive: true })

  for (const file of files) {
    const fullPath = resolve(outputDir, file.path)
    mkdirSync(dirname(fullPath), { recursive: true })
    writeFileSync(fullPath, file.content, 'utf-8')
  }

  writeFileSync(resolve(outputDir, 'tsconfig.json'), TSCONFIG, 'utf-8')
})

afterAll(() => {
  rmSync(outputDir, { recursive: true, force: true })
})

describe('Generated component files — TypeScript compilation', () => {
  it('tsc binary exists in workspace node_modules', () => {
    expect(existsSync(tscBin)).toBe(true)
  })

  it('generated output directory was created with files', () => {
    expect(existsSync(outputDir)).toBe(true)
  })

  it('compiles all generated .tsx/.ts files with zero TypeScript errors', () => {
    let stdout = ''
    let exitCode = 0
    try {
      stdout = execSync(`"${tscBin}" --noEmit --project tsconfig.json`, {
        cwd: outputDir,
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
