import { test, expect } from '@playwright/test'

// ---- helpers ----

function uniqueEmail() {
  return `test-${Date.now()}@example.com`
}

// ---- Journey 3.1.1–3.1.4: register → verify email → login → home ----

test('register → verify email → login → home', async ({ page, request }) => {
  const email = uniqueEmail()
  const password = 'securepassword123'

  // Intercept the register response to capture X-Verification-Token
  let verifyToken: string | null = null
  await page.route('**/auth/register', async (route) => {
    const response = await route.fetch()
    verifyToken = response.headers()['x-verification-token'] ?? null
    await route.fulfill({ response })
  })

  // 3.1.1 — navigate to /register
  await page.goto('/register')

  // 3.1.2 — fill and submit register form
  await page.getByLabel('Name').fill('Test User')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()

  // Wait for "Check your email" confirmation
  await expect(page.getByText('Check your email')).toBeVisible()
  expect(verifyToken).toBeTruthy()

  // 3.1.3 — verify email via direct API call (standalone context — no browser session set)
  const verifyRes = await request.post('http://localhost:3001/auth/verify-email', {
    data: { token: verifyToken },
  })
  expect(verifyRes.ok()).toBe(true)

  // 3.1.4 — log in via browser form
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()

  // Assert home page loaded
  await page.waitForURL('/projects')
  await expect(page).toHaveURL('/projects')
})

// ---- Journey: login with wrong password shows error ----

test('login with wrong password shows error message', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill('nobody@example.com')
  await page.getByLabel('Password').fill('wrongpassword123')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page.getByText('Invalid credentials')).toBeVisible({ timeout: 10_000 })
  await expect(page).toHaveURL('/login')
})

// ---- Journey 3.2.1: unauthenticated user redirected to /login ----

test('unauthenticated visit to /projects redirects to /login', async ({ page }) => {
  await page.goto('/projects')
  await page.waitForURL('/login')
  await expect(page).toHaveURL('/login')
})
