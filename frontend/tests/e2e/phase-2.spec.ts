import { test, expect, type Page } from '@playwright/test'

const PREVIEW_READY_TIMEOUT = 10_000

async function waitForPreviewReady(page: Page) {
  await page.waitForFunction(
    () => (window as Window & { __previewReady?: boolean }).__previewReady === true,
    undefined,
    { timeout: PREVIEW_READY_TIMEOUT },
  )
}

test.describe('Phase 2 — creation flow', () => {
  test('1.1 default state: preview renders on arrival', async ({ page }) => {
    await page.goto('/new')

    // iframe is visible
    const iframe = page.locator('iframe[title="Design System Preview"]')
    await expect(iframe).toBeVisible()

    // progress indicator shows Stage 1 active
    await expect(page.getByRole('heading', { name: 'Foundation' })).toBeVisible()

    // "SaaS / Web App" card is selected (has ring styling)
    const saasCard = page.getByRole('button', { name: /SaaS \/ Web App/i })
    await expect(saasCard).toBeVisible()
    await expect(saasCard).toHaveClass(/ring-blue-500/)

    // wait for READY
    await waitForPreviewReady(page)

    // iframe is showing content (opacity transitioned to 1)
    await expect(iframe).toHaveCSS('opacity', '1')
  })

  test('1.2 project type change updates scope chips', async ({ page }) => {
    await page.goto('/new')

    // initial state: 6 scope chips
    const chips = page.locator('.inline-flex.rounded-full')
    await expect(chips).toHaveCount(6)

    // click Marketing Site
    await page.getByRole('button', { name: /Marketing Site/i }).click()

    // 4 chips remain — no Overlays, no Data Display
    await expect(chips).toHaveCount(4)
    await expect(page.locator('span.rounded-full', { hasText: 'Overlays' })).not.toBeVisible()
    await expect(page.locator('span.rounded-full', { hasText: 'Data Display' })).not.toBeVisible()
  })

  test('1.3 color direction change updates preview primary color', async ({ page }) => {
    await page.goto('/new')

    // wait for READY + initial CONFIG_UPDATE to have been processed
    await waitForPreviewReady(page)

    // get the preview iframe frame
    const frame = page.frame({ url: /localhost:5180/ })
    expect(frame).not.toBeNull()

    // wait for CSS variables to be applied in the iframe
    await frame!.waitForFunction(
      () =>
        getComputedStyle(document.documentElement)
          .getPropertyValue('--color-primary-500')
          .trim() !== '',
      { timeout: 5_000 },
    )

    const initialColor = await frame!.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue('--color-primary-500')
        .trim(),
    )

    // select Warm & Approachable
    await page.getByRole('button', { name: /Warm & Approachable/i }).click()

    // wait for the CSS variable to change
    await frame!.waitForFunction(
      (init) =>
        getComputedStyle(document.documentElement)
          .getPropertyValue('--color-primary-500')
          .trim() !== init,
      initialColor,
      { timeout: 5_000 },
    )

    const newColor = await frame!.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue('--color-primary-500')
        .trim(),
    )

    expect(newColor).not.toBe(initialColor)
    expect(newColor).not.toBe('')
  })

  test('1.4 Stage 2 axis selections update preview tokens', async ({ page }) => {
    await page.goto('/new')

    await waitForPreviewReady(page)

    const frame = page.frame({ url: /localhost:5180/ })
    expect(frame).not.toBeNull()

    // advance to Stage 2
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByRole('heading', { name: 'Style', exact: true })).toBeVisible()

    // --- density ---
    const initialSpacing = await frame!.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue('--spacing-base')
        .trim(),
    )

    await page.getByRole('button', { name: /^Compact/i }).click()

    await frame!.waitForFunction(
      (init) =>
        getComputedStyle(document.documentElement)
          .getPropertyValue('--spacing-base')
          .trim() !== init,
      initialSpacing,
      { timeout: 5_000 },
    )

    // --- type style → Fraunces ---
    await page.getByRole('button', { name: /Serif-accented/i }).click()

    await frame!.waitForFunction(
      () =>
        getComputedStyle(document.documentElement)
          .getPropertyValue('--font-display')
          .trim()
          .includes('Fraunces'),
    )

    // --- dimensionality → flat → shadow-sm = none ---
    await page.getByRole('button', { name: /^Flat/i }).click()

    await frame!.waitForFunction(
      () =>
        getComputedStyle(document.documentElement)
          .getPropertyValue('--shadow-sm')
          .trim() === 'none',
      { timeout: 5_000 },
    )
  })

  test('1.5 complete flow → download ZIP', async ({ page }) => {
    await page.goto('/new')

    // Stage 1 — advance (SaaS is default, advance condition always met)
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByRole('heading', { name: 'Style', exact: true })).toBeVisible()

    // Stage 2 — advance
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByRole('heading', { name: 'Review' })).toBeVisible()

    // Stage 3 — enter project name
    await page.getByPlaceholder('My Design System').fill('E2E Test System')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByRole('heading', { name: 'Export' })).toBeVisible()

    // Stage 4 — click Download package, wait for download
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download package' }).click()
    const download = await downloadPromise

    // downloaded filename ends with .zip
    expect(download.suggestedFilename()).toMatch(/\.zip$/)

    // anonymousStore has an entry
    const anonData = await page.evaluate(() =>
      localStorage.getItem('ds-gen-anonymous'),
    )
    expect(anonData).not.toBeNull()
    const parsed = JSON.parse(anonData!) as { state: { entries: unknown[] } }
    expect(parsed.state.entries.length).toBeGreaterThan(0)

    // flow config localStorage cleared
    const flowConfig = await page.evaluate(() =>
      localStorage.getItem('ds-gen-flow-config'),
    )
    expect(flowConfig).toBeNull()
  })
})
