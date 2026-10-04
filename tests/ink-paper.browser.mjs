import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'

const { chromium } = createRequire(process.env.TTF_PLAYWRIGHT_PACKAGE_JSON)('playwright')
const browser = await chromium.launch({ executablePath: process.env.TTF_BROWSER_PATH, headless: true })
await mkdir('output/playwright', { recursive: true })
try {
  for (const [name, width, height] of [['desktop', 1600, 1000], ['pad', 820, 1180], ['phone', 390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' })
    await context.addInitScript(() => { try { sessionStorage.setItem('ttf-intro-seen', '1') } catch {} })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(process.env.TTF_TEST_URL ?? 'http://127.0.0.1:5173/')
    await page.locator('#home h1').waitFor({ state: 'visible' })
    await page.waitForTimeout(2000)
    assert.equal(await page.locator('.atlas-ink-paper').getAttribute('aria-hidden'), 'true')
    assert.equal(await page.locator('.atlas-ink-paper').evaluate(el => getComputedStyle(el).pointerEvents), 'none')
    const logo = await page.locator('.atlas-ink-emblem image').getAttribute('href')
    assert.equal((await page.request.get(new URL(logo, page.url()).href)).status(), 200)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await page.screenshot({ path: `output/playwright/ink-home-${name}.png` })
    const before = await page.locator('[data-atlas-scene]').getAttribute('data-atlas-scene')
    await page.locator('.atlas-scene-selector.is-next').click()
    assert.notEqual(await page.locator('[data-atlas-scene]').getAttribute('data-atlas-scene'), before)
    assert.deepEqual(errors, [])
    console.log(`${name}: paper/logo visible, no horizontal overflow or page errors, scene control works`)
    await context.close()
  }
} finally { await browser.close() }
