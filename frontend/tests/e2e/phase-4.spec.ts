// Covers journey steps: 4.2.3, 4.2.4, 5.1.1–5.1.4

import { test, expect, type Page, type APIRequestContext } from '@playwright/test'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

const BACKEND_URL = 'http://localhost:3001'
const CLI_PATH = path.join(process.cwd(), '../cli/dist/index.js')

function uniqueEmail() {
  return `test-${Date.now()}@example.com`
}

const DEFAULT_CONFIG = {
  projectType: 'saas',
  componentScope: ['forms', 'navigation', 'overlays', 'feedback', 'data-display', 'layout'],
  modes: ['light'],
  color: {
    source: 'generated',
    primaryHex: '#3b82f6',
    colorDirection: 'cool-professional',
    neutralFamily: 'slate',
  },
  typography: {
    source: 'chosen',
    typeStyle: 'geometric',
    displayFace: 'Inter',
    bodyFace: 'Inter',
    codeFace: 'JetBrains Mono',
    scaleRatio: 1.25,
  },
  shape: { density: 'balanced', personality: 'professional', dimensionality: 'subtle' },
}

async function apiRegisterVerifyBrowserLogin(
  page: Page,
  request: APIRequestContext,
  email: string,
  password: string,
) {
  const regRes = await request.post(`${BACKEND_URL}/auth/register`, {
    data: { displayName: 'Test User', email, password },
  })
  expect(regRes.ok()).toBe(true)
  const verifyToken = regRes.headers()['x-verification-token']
  expect(verifyToken).toBeTruthy()

  const verifyRes = await request.post(`${BACKEND_URL}/auth/verify-email`, {
    data: { token: verifyToken },
  })
  expect(verifyRes.ok()).toBe(true)

  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL('/projects', { timeout: 10_000 })
}

async function createProjectAndCliToken(page: Page): Promise<{ projectId: string; cliToken: string }> {
  const projectId = await page.evaluate(async (config) => {
    const res = await fetch('/projects', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'CLI Test Project', config }),
    })
    const data = (await res.json()) as { project: { id: string } }
    return data.project.id
  }, DEFAULT_CONFIG)

  const cliToken = await page.evaluate(async () => {
    const res = await fetch('/auth/cli-token', {
      method: 'POST',
      credentials: 'include',
    })
    const data = (await res.json()) as { token: string }
    return data.token
  })

  expect(projectId).toBeTruthy()
  expect(cliToken).toBeTruthy()
  return { projectId, cliToken }
}

// ---- Test 1: CLI init writes expected directories and files ----

test('CLI init writes tokens/, components/, docs/ with files', async ({ page, request }) => {
  await apiRegisterVerifyBrowserLogin(page, request, uniqueEmail(), 'securepassword123')
  const { projectId, cliToken } = await createProjectAndCliToken(page)

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-gen-init-'))
  try {
    execSync(`node "${CLI_PATH}" init --project=${projectId}`, {
      cwd: tmpDir,
      env: { ...process.env, DS_GEN_TOKEN: cliToken, DS_GEN_API_URL: BACKEND_URL },
    })

    expect(fs.existsSync(path.join(tmpDir, 'tokens'))).toBe(true)
    expect(fs.existsSync(path.join(tmpDir, 'components'))).toBe(true)
    expect(fs.existsSync(path.join(tmpDir, 'docs'))).toBe(true)
    expect(fs.readdirSync(path.join(tmpDir, 'tokens')).length).toBeGreaterThan(0)
    expect(fs.readdirSync(path.join(tmpDir, 'components')).length).toBeGreaterThan(0)
    expect(fs.readdirSync(path.join(tmpDir, 'docs')).length).toBeGreaterThan(0)

    const meta = JSON.parse(
      fs.readFileSync(path.join(tmpDir, '.design-system-meta.json'), 'utf8'),
    ) as { projectId: string; generatedAt: string }
    expect(meta.projectId).toBe(projectId)
    expect(typeof meta.generatedAt).toBe('string')
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
})

// ---- Test 2: CLI sync updates generatedAt timestamp ----

test('CLI sync re-fetches files and updates generatedAt', async ({ page, request }) => {
  await apiRegisterVerifyBrowserLogin(page, request, uniqueEmail(), 'securepassword123')
  const { projectId, cliToken } = await createProjectAndCliToken(page)

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-gen-sync-'))
  const env = { ...process.env, DS_GEN_TOKEN: cliToken, DS_GEN_API_URL: BACKEND_URL }

  try {
    execSync(`node "${CLI_PATH}" init --project=${projectId}`, { cwd: tmpDir, env })
    const metaBefore = JSON.parse(
      fs.readFileSync(path.join(tmpDir, '.design-system-meta.json'), 'utf8'),
    ) as { generatedAt: string }

    // Wait 1s so the new timestamp is strictly later
    await new Promise((r) => setTimeout(r, 1100))

    execSync(`node "${CLI_PATH}" sync`, { cwd: tmpDir, env })
    const metaAfter = JSON.parse(
      fs.readFileSync(path.join(tmpDir, '.design-system-meta.json'), 'utf8'),
    ) as { generatedAt: string }

    expect(new Date(metaAfter.generatedAt) > new Date(metaBefore.generatedAt)).toBe(true)
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
})

// ---- Test 3: Agent API returns valid spec ----

test('agent API GET /spec returns 200 with tokens, components, rules', async ({ request }) => {
  const createRes = await request.post(`${BACKEND_URL}/projects`, {
    data: { name: 'Agent Test', config: DEFAULT_CONFIG },
  })
  expect(createRes.ok()).toBe(true)
  const { project } = (await createRes.json()) as { project: { id: string } }

  const specRes = await request.get(`${BACKEND_URL}/api/v1/systems/${project.id}/spec`)
  expect(specRes.ok()).toBe(true)

  const spec = (await specRes.json()) as {
    tokens: { colorCount: number }
    components: Array<{ name: string }>
    rules: string[]
  }

  // tokens snapshot
  expect(spec.tokens).toBeDefined()
  expect(spec.tokens.colorCount).toBeGreaterThan(0)

  // components list contains at least one entry (e.g. Button)
  expect(Array.isArray(spec.components)).toBe(true)
  expect(spec.components.length).toBeGreaterThan(0)
  expect(typeof spec.components[0]!.name).toBe('string')

  // rules is a non-empty string array
  expect(Array.isArray(spec.rules)).toBe(true)
  expect(spec.rules.length).toBeGreaterThan(0)
  expect(typeof spec.rules[0]).toBe('string')
})

// ---- Test 4: Agent API returns 404 for unknown project ----

test('agent API returns 404 for unknown project ID', async ({ request }) => {
  const res = await request.get(
    `${BACKEND_URL}/api/v1/systems/00000000-0000-0000-0000-000000000000/spec`,
  )
  expect(res.status()).toBe(404)
})
