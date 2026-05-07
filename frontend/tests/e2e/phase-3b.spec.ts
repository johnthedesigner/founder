import { test, expect, type Page, type APIRequestContext } from '@playwright/test'

const BACKEND_URL = 'http://localhost:3001'
const FLOW_CONFIG_KEY = 'ds-gen-flow-config'
const PREVIEW_READY_TIMEOUT = 10_000

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
  shape: {
    density: 'balanced',
    personality: 'professional',
    dimensionality: 'subtle',
  },
}

async function waitForPreviewReady(page: Page) {
  await page.waitForFunction(
    () => (window as Window & { __previewReady?: boolean }).__previewReady === true,
    undefined,
    { timeout: PREVIEW_READY_TIMEOUT },
  )
}

async function readFlowColor(page: Page): Promise<Record<string, unknown>> {
  const raw = await page.evaluate((key: string) => localStorage.getItem(key), FLOW_CONFIG_KEY)
  if (!raw) return {}
  const parsed = JSON.parse(raw) as { color?: Record<string, unknown> }
  return parsed.color ?? {}
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

// ---- Test 1: preset palette selection updates config and preview ----

test('preset palette selection updates config and preview', async ({ page }) => {
  await page.goto('/new')
  await expect(page.getByRole('heading', { name: 'Foundation' })).toBeVisible()

  // Select Teal & Coral preset (primaryHex: #0F766E, accentHex: #E44D26)
  await page.getByRole('button', { name: /Teal & Coral/i }).click()

  // Config stored in localStorage reflects preset hex values
  const color = await readFlowColor(page)
  expect(color.primaryHex).toBe('#0F766E')
  expect(color.accentHex).toBe('#E44D26')

  // Preview updates — wait for iframe ready signal
  await waitForPreviewReady(page)

  // Advance to Stage 3 (Review)
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('heading', { name: 'Review' })).toBeVisible()

  // Primitives section shows a non-zero token count including color scales
  await expect(page.getByText(/\d+ tokens · \d+ scales/)).toBeVisible({ timeout: 5_000 })
})

// ---- Test 2: custom color pickers sync with hex fields ----

test('custom color pickers sync with hex fields', async ({ page }) => {
  await page.goto('/new')

  // Select the Custom tile explicitly
  await page.getByRole('button', { name: /Custom/i }).click()

  // Primary hex input is the only hex text input visible initially
  const hexInputs = page.locator('input[placeholder="#3b82f6"]')
  await expect(hexInputs).toHaveCount(1)

  // Type a new primary hex value — onChange fires on each keystroke, committing on valid hex
  await hexInputs.first().fill('#7C3AED')

  // Config updated in localStorage
  const color1 = await readFlowColor(page)
  expect(color1.primaryHex).toBe('#7C3AED')

  // The hidden color picker reflects the same value (browser normalizes to lowercase)
  const primaryPickerLabel = page.locator('label').filter({
    has: page.locator('span[aria-label="Primary color picker"]'),
  })
  await expect(primaryPickerLabel.locator('input[type="color"]')).toHaveValue('#7c3aed')

  // Enable the Secondary color row via its checkbox
  await page.getByRole('checkbox', { name: /Secondary/i }).check()
  await expect(hexInputs).toHaveCount(2)

  // Set secondary hex
  await hexInputs.nth(1).fill('#059669')

  // Config has both values
  const color2 = await readFlowColor(page)
  expect(color2.primaryHex).toBe('#7C3AED')
  expect(color2.secondaryHex).toBe('#059669')
})

// ---- Test 3: functional color chips reflect active roles per project type ----

test('functional color chips reflect active roles per project type', async ({ page }) => {
  await page.goto('/new')
  await expect(page.getByRole('heading', { name: 'Foundation' })).toBeVisible()

  // SaaS (default): all 4 functional roles active — none show "off"
  // Functional chips use bg-gray-50 (scope chips use bg-blue-50)
  const functionalChips = page.locator('.inline-flex.rounded-full.bg-gray-50')
  await expect(functionalChips).toHaveCount(4)

  const warningChip = functionalChips.filter({ hasText: 'Warning' })
  const successChip = functionalChips.filter({ hasText: 'Success' })
  const infoChip = functionalChips.filter({ hasText: 'Info' })

  await expect(warningChip).toBeVisible()
  await expect(warningChip.locator('span', { hasText: 'off' })).not.toBeAttached()
  await expect(successChip.locator('span', { hasText: 'off' })).not.toBeAttached()
  await expect(infoChip.locator('span', { hasText: 'off' })).not.toBeAttached()

  // Switch to Marketing Site: only Error remains active
  await page.getByRole('button', { name: /Marketing Site/i }).click()

  const errorChip = functionalChips.filter({ hasText: 'Error' })
  await expect(errorChip.locator('span', { hasText: 'off' })).not.toBeAttached()

  await expect(warningChip.locator('span', { hasText: 'off' })).toBeAttached()
  await expect(successChip.locator('span', { hasText: 'off' })).toBeAttached()
  await expect(infoChip.locator('span', { hasText: 'off' })).toBeAttached()
})

// ---- Test 4: landing page access + authenticated redirect ----

test('unauthenticated user sees landing page; authenticated user redirected from / to /projects', async ({
  page,
  request,
}) => {
  // No session — landing page renders
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 5_000 })
  await expect(page.getByRole('link', { name: /Start for free/i })).toBeVisible()

  // "Start for free" CTA navigates to /new
  await page.getByRole('link', { name: /Start for free/i }).click()
  await page.waitForURL('/new', { timeout: 5_000 })

  // Register, verify, and login
  const email = uniqueEmail()
  const password = 'securepassword123'
  await apiRegisterVerifyBrowserLogin(page, request, email, password)
  // now at /projects

  // Authenticated visit to / immediately redirects to /projects
  await page.goto('/')
  await page.waitForURL('/projects', { timeout: 5_000 })

  // Project grid (empty for this new account) is shown
  await expect(page.getByText('No projects yet')).toBeVisible({ timeout: 5_000 })
})

// ---- Test 5: project grid at /projects ----

test('project grid shows created projects; "New project" navigates to /new', async ({
  page,
  request,
}) => {
  const email = uniqueEmail()
  const password = 'securepassword123'

  await apiRegisterVerifyBrowserLogin(page, request, email, password)

  // Create a project via the authenticated browser session
  await page.evaluate(async (config) => {
    await fetch('/projects', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ name: 'Grid Test Project', config }),
    })
  }, DEFAULT_CONFIG)

  // Navigate to /projects — project card is visible
  await page.goto('/projects')
  await expect(page.getByRole('heading', { name: 'Grid Test Project' })).toBeVisible({
    timeout: 5_000,
  })

  // "New project" button navigates to /new
  await page.getByRole('button', { name: 'New project' }).click()
  await page.waitForURL('/new', { timeout: 5_000 })

  // Navigating back to /projects: project card is still visible (no new project created)
  await page.goto('/projects')
  await expect(page.getByRole('heading', { name: 'Grid Test Project' })).toBeVisible({
    timeout: 5_000,
  })
})
