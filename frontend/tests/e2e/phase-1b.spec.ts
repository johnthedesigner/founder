import { test, expect } from '@playwright/test'

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

function anonymousStoreValue(id: string, ownerToken: string, name: string) {
  return JSON.stringify({
    state: {
      entries: [{ id, ownerToken, name, createdAt: new Date().toISOString() }],
    },
    version: 0,
  })
}

async function seedLocalStorage(
  page: Parameters<Parameters<typeof test>[1]>[0]['page'],
  id: string,
  ownerToken: string,
  name: string,
) {
  // Navigate to the app origin first, then seed localStorage so the next
  // full-page navigation will have the store hydrate from the seeded value.
  await page.goto('/login')
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: ANON_STORAGE_KEY, value: anonymousStoreValue(id, ownerToken, name) },
  )
}

// ---- Journey 6.1.2–6.1.3: anonymous create → canEdit when ownerToken in localStorage ----

test('anonymous project page shows owner controls when ownerToken is in localStorage', async ({
  page,
  request,
}) => {
  const createRes = await request.post(`${BACKEND_URL}/projects`, {
    data: { name: 'Anon Project', config: DEFAULT_CONFIG },
  })
  expect(createRes.ok()).toBe(true)
  const body = (await createRes.json()) as { project: { id: string; name: string }; ownerToken: string }

  await seedLocalStorage(page, body.project.id, body.ownerToken, body.project.name)

  // Full navigation — Zustand hydrates from localStorage → getProject sends X-Owner-Token → canEdit: true
  await page.goto(`/projects/${body.project.id}`)
  await expect(page.getByText('You own this')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('Sign in to edit')).not.toBeVisible()
})

// ---- Journey 6.1.4: fresh context (no localStorage) → read-only ----

test('anonymous project page is read-only without ownerToken in localStorage', async ({
  page,
  request,
}) => {
  const createRes = await request.post(`${BACKEND_URL}/projects`, {
    data: { name: 'Public Project', config: DEFAULT_CONFIG },
  })
  expect(createRes.ok()).toBe(true)
  const body = (await createRes.json()) as { project: { id: string } }

  // Navigate with no localStorage — canEdit: false
  await page.goto(`/projects/${body.project.id}`)
  await expect(page.getByText('Sign in to edit')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('You own this')).not.toBeVisible()
})

// ---- Journey 6.3.1: clear localStorage → read-only on reload ----

test('clearing localStorage makes project page read-only on reload', async ({
  page,
  request,
}) => {
  const createRes = await request.post(`${BACKEND_URL}/projects`, {
    data: { name: 'Clearable Project', config: DEFAULT_CONFIG },
  })
  expect(createRes.ok()).toBe(true)
  const body = (await createRes.json()) as { project: { id: string; name: string }; ownerToken: string }

  await seedLocalStorage(page, body.project.id, body.ownerToken, body.project.name)
  await page.goto(`/projects/${body.project.id}`)
  await expect(page.getByText('You own this')).toBeVisible({ timeout: 10_000 })

  // Clear localStorage, reload — store re-initializes from empty storage
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await expect(page.getByText('Sign in to edit')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('You own this')).not.toBeVisible()
})

// ---- Journey 6.2.2–6.2.3: register → login → claim → project in home grid ----

test('register → login → claim anonymous project → appears in home grid', async ({
  page,
  request,
}) => {
  const email = uniqueEmail()
  const password = 'securepassword123'

  // Create anonymous project via API
  const createRes = await request.post(`${BACKEND_URL}/projects`, {
    data: { name: 'Claim Me', config: DEFAULT_CONFIG },
  })
  expect(createRes.ok()).toBe(true)
  const body = (await createRes.json()) as { project: { id: string; name: string }; ownerToken: string }

  // Seed localStorage on the app origin. localStorage persists across same-origin
  // page navigations so the store will hydrate with the entry on every subsequent load.
  await seedLocalStorage(page, body.project.id, body.ownerToken, body.project.name)

  // Capture the verification token from the register response
  let verifyToken: string | null = null
  await page.route('**/auth/register', async (route) => {
    const response = await route.fetch()
    verifyToken = response.headers()['x-verification-token'] ?? null
    await route.fulfill({ response })
  })

  // Register new account
  await page.goto('/register')
  await page.getByLabel('Name').fill('Claim Tester')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByText('Check your email')).toBeVisible()
  expect(verifyToken).toBeTruthy()

  // Verify email via standalone API request (no browser session)
  const verifyRes = await request.post(`${BACKEND_URL}/auth/verify-email`, {
    data: { token: verifyToken },
  })
  expect(verifyRes.ok()).toBe(true)

  // Login — localStorage still holds the anonymous entry (not cleared during register)
  // page.goto causes a full reload so Zustand hydrates from localStorage on mount
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()

  // ClaimPrompt appears because anonymousStore had entries at login page load time
  await expect(page.getByText('Claim your projects')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('Claim Me')).toBeVisible()

  // Claim the project
  await page.getByRole('button', { name: 'Claim' }).click()

  // After claiming, all entries are gone → ClaimPrompt auto-navigates to /projects
  await page.waitForURL('/projects', { timeout: 10_000 })

  // localStorage entry should be cleared (entries array is now empty)
  const stored = await page.evaluate((key: string) => localStorage.getItem(key), ANON_STORAGE_KEY)
  const parsed = JSON.parse(stored ?? '{"state":{"entries":[]}}') as {
    state: { entries: unknown[] }
  }
  expect(parsed.state.entries).toHaveLength(0)

  // Claimed project should appear in the authenticated home grid
  await expect(page.getByRole('heading', { name: 'Claim Me' })).toBeVisible({ timeout: 10_000 })
})
