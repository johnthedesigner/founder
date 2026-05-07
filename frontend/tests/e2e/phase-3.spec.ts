import { test, expect } from '@playwright/test'
import type { APIRequestContext, Page } from '@playwright/test'

const BACKEND_URL = 'http://localhost:3001'
const ANON_STORAGE_KEY = 'ds-gen-anonymous'

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

// Advance page through /new stages 1-3 then land on stage 4
async function advanceToStage4(page: Page) {
  await page.goto('/new')
  // Stage 1 → 2 → 3 → 4 (Continue button, 3 clicks)
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Continue' }).click()
  }
  await expect(page.getByRole('heading', { name: 'Export' })).toBeVisible({ timeout: 10_000 })
}

// Register+verify via API, then login via browser form. Returns the verified email.
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

// ---- Test 1: complete flow → register in-flow → "Check your email" ----

test('complete flow → register in-flow → shows "Check your email" without redirect', async ({
  page,
}) => {
  await advanceToStage4(page)

  // Trigger anonymous project creation
  await page.getByRole('button', { name: 'Download package' }).click()
  // Wait for save to complete (button re-enables)
  await expect(page.getByRole('button', { name: 'Download package' })).toBeEnabled({ timeout: 10_000 })

  // Open registration form via the account-prompt teaser
  await page.getByRole('button', { name: 'Save my project' }).click()
  await expect(page.getByText('Create your account')).toBeVisible()

  // Fill and submit the inline registration form
  await page.locator('#reg-name').fill('Flow Tester')
  await page.locator('#reg-email').fill(`test-flow-${Date.now()}@example.com`)
  await page.locator('#reg-password').fill('securepassword123')
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page.getByText('Check your email')).toBeVisible({ timeout: 10_000 })
  await expect(page).toHaveURL('/new')
})

// ---- Test 2: register in-flow → verify → login → claim → project card → return with config ----

test('in-flow register → verify → login → claim anonymous project → navigate to project page with config', async ({
  page,
  request,
}) => {
  const email = uniqueEmail()
  const password = 'securepassword123'

  await advanceToStage4(page)

  // Intercept register response to capture X-Verification-Token
  let verifyToken: string | null = null
  await page.route('**/auth/register', async (route) => {
    const response = await route.fetch()
    verifyToken = response.headers()['x-verification-token'] ?? null
    await route.fulfill({ response })
  })

  // Trigger anonymous project creation — anonymousStore entry added to localStorage
  await page.getByRole('button', { name: 'Download package' }).click()
  await expect(page.getByRole('button', { name: 'Download package' })).toBeEnabled({ timeout: 10_000 })

  // Open and submit in-flow registration form
  await page.getByRole('button', { name: 'Save my project' }).click()
  await page.locator('#reg-name').fill('Claim Tester')
  await page.locator('#reg-email').fill(email)
  await page.locator('#reg-password').fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByText('Check your email')).toBeVisible({ timeout: 10_000 })
  expect(verifyToken).toBeTruthy()

  // Verify email via standalone API (no browser session)
  const verifyRes = await request.post(`${BACKEND_URL}/auth/verify-email`, {
    data: { token: verifyToken },
  })
  expect(verifyRes.ok()).toBe(true)

  // Login — localStorage still holds the anonymous entry (Zustand hydrates on page load)
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()

  // Claim prompt appears because anonymousStore had entries
  await expect(page.getByText('Claim your projects')).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Claim' }).click()

  // After claiming, ClaimPrompt navigates to /projects
  await page.waitForURL('/projects', { timeout: 10_000 })

  // Verify localStorage entry is cleared
  const stored = await page.evaluate((key: string) => localStorage.getItem(key), ANON_STORAGE_KEY)
  const parsed = JSON.parse(stored ?? '{"state":{"entries":[]}}') as {
    state: { entries: unknown[] }
  }
  expect(parsed.state.entries).toHaveLength(0)

  // Project card should appear in home grid
  await expect(page.getByRole('heading', { name: 'My Design System' })).toBeVisible({ timeout: 10_000 })

  // Navigate to the project page
  await page.getByRole('heading', { name: 'My Design System' }).click()
  await expect(page).toHaveURL(/\/projects\//, { timeout: 10_000 })

  // Stage 1 (Foundation) should be visible, confirming project config was restored
  await expect(page.getByRole('heading', { name: 'Foundation' })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('SaaS / Web App')).toBeVisible({ timeout: 10_000 })
})

// ---- Test 3: return to saved project → config intact → PATCH on change → ZIP export ----

test('return to saved project → config matches → PATCH fires on change → ZIP download triggered', async ({
  page,
  request,
}) => {
  const email = uniqueEmail()
  const password = 'securepassword123'

  await apiRegisterVerifyBrowserLogin(page, request, email, password)

  // Create an authenticated project inside the browser's JS context (shares session cookie)
  const projectId = await page.evaluate(async (config) => {
    const res = await fetch('/projects', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ name: 'Return Test Project', config }),
    })
    const data = (await res.json()) as { project: { id: string } }
    return data.project.id
  }, DEFAULT_CONFIG)

  // Navigate to the saved project page
  await page.goto(`/projects/${projectId}`)
  await expect(page.getByRole('heading', { name: 'Foundation' })).toBeVisible({ timeout: 10_000 })

  // Assert Stage 1 config matches stored config (SaaS project type selected)
  await expect(page.getByText('SaaS / Web App')).toBeVisible()

  // Intercept PATCH to verify auto-save fires after config change
  let patchFired = false
  await page.route(`**/projects/${projectId}`, async (route) => {
    if (route.request().method() === 'PATCH') {
      patchFired = true
    }
    await route.continue()
  })

  // Select a palette preset → triggers configStore update → auto-save debounce
  await page.getByRole('button', { name: /Forest & Gold/i }).click()

  // Wait up to 1s for PATCH to fire (500ms debounce + small network margin)
  await page.waitForTimeout(1000)
  expect(patchFired).toBe(true)

  // Advance to Stage 4
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Continue' }).click()
  }
  await expect(page.getByRole('heading', { name: 'Export' })).toBeVisible({ timeout: 10_000 })

  // Assert the saved URL banner is already visible (project is authenticated, already saved)
  await expect(page.getByText('Your design system is saved')).toBeVisible()

  // Intercept ZIP download request
  let zipRequested = false
  await page.route(`**/projects/${projectId}/export.zip`, async (route) => {
    zipRequested = true
    await route.continue()
  })

  await page.getByRole('button', { name: 'Download package' }).click()
  await page.waitForTimeout(2000)
  expect(zipRequested).toBe(true)
})

// ---- Test 4: home page — duplicate and delete ----

test('home page: duplicate project → two cards; delete original → only copy remains', async ({
  page,
  request,
}) => {
  const email = uniqueEmail()
  const password = 'securepassword123'

  await apiRegisterVerifyBrowserLogin(page, request, email, password)

  // Create a project inside the browser's JS context (shares session cookie)
  await page.evaluate(async (config) => {
    await fetch('/projects', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ name: 'Manage Me', config }),
    })
  }, DEFAULT_CONFIG)

  // Navigate to home — project card should be visible
  await page.goto('/projects')
  await expect(page.getByRole('heading', { name: 'Manage Me', exact: true })).toBeVisible({ timeout: 10_000 })

  // Open overflow menu on the project card and duplicate
  await page.getByRole('button', { name: 'Project options' }).first().click()
  await page.getByRole('button', { name: 'Duplicate' }).click()

  // Two cards should now be visible: original + copy
  await expect(page.getByRole('heading', { name: 'Manage Me', exact: true })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('heading', { name: 'Manage Me (copy)' })).toBeVisible({ timeout: 10_000 })

  // Delete the original: open its overflow menu, click Delete, confirm
  // The original card's name is "Manage Me"; find it specifically
  const originalCard = page.locator('li').filter({ has: page.getByRole('heading', { name: 'Manage Me', exact: true }) })
  await originalCard.getByRole('button', { name: 'Project options' }).click()

  // Handle confirm dialog
  page.once('dialog', (dialog) => void dialog.accept())
  await page.getByRole('button', { name: 'Delete' }).click()

  // Only the copy should remain
  await expect(page.getByRole('heading', { name: 'Manage Me (copy)' })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('heading', { name: 'Manage Me', exact: true })).not.toBeVisible()
})
