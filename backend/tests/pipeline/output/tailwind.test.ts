import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { resolve } from 'path'
import { serializeToTailwind } from '../../../src/pipeline/export/tailwind'
import { generatePrimitives } from '../../../src/pipeline/tokens/primitives'
import { generateSemanticTokens } from '../../../src/pipeline/tokens/semantic'
import { DEFAULT_CONFIG } from '../../../src/pipeline/palette/defaults'

const workspaceRoot = resolve(process.cwd(), '..')
const tscBin = resolve(workspaceRoot, 'node_modules/.bin/tsc')
const outputDir = resolve(process.cwd(), 'tests/_gen_tailwind')

const TSCONFIG = JSON.stringify(
  {
    compilerOptions: {
      target: 'ESNext',
      module: 'ESNext',
      moduleResolution: 'bundler',
      strict: true,
      skipLibCheck: true,
      noEmit: true,
    },
    include: ['./**/*.ts'],
  },
  null,
  2,
)

beforeAll(() => {
  const primitives = generatePrimitives(DEFAULT_CONFIG)
  const semantic = generateSemanticTokens(primitives, DEFAULT_CONFIG)
  const tw = serializeToTailwind(semantic)

  rmSync(outputDir, { recursive: true, force: true })
  mkdirSync(outputDir, { recursive: true })
  writeFileSync(resolve(outputDir, 'tailwind.config.ts'), tw, 'utf-8')
  writeFileSync(resolve(outputDir, 'tsconfig.json'), TSCONFIG, 'utf-8')
})

afterAll(() => {
  rmSync(outputDir, { recursive: true, force: true })
})

describe('Generated Tailwind config — TypeScript compilation', () => {
  it('tsc binary exists in workspace node_modules', () => {
    expect(existsSync(tscBin)).toBe(true)
  })

  it('tailwind.config.ts compiles with zero TypeScript errors', () => {
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
