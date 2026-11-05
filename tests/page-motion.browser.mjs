import assert from 'node:assert/strict'
import { chromium } from 'playwright'

// Uses a separate React fixture: no account login, cloud calls or dependency on another test's browser state.
const base = process.env.TTF_TEST_URL ?? 'http://127.0.0.1:5173/'
const browser = await chromium.launch({
  executablePath: process.env.TTF_BROWSER_PATH ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
})
try {
  const context = await browser.newContext()
  const page = await context.newPage(), errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(new URL('tests/fixtures/page-motion.html#home', base).href)
  await page.waitForFunction(() => Boolean(window.pageMotionHarness))
  const initialHistory = await page.evaluate(() => history.length)
  await page.evaluate(() => window.pageMotionHarness.navigate(1))
  await page.locator('[data-transition-phase=enter]').waitFor()
  assert.equal(await page.locator('[data-transition-phase=enter]').getAttribute('data-transition-preset'), 'slide')
  assert.ok(await page.locator('[data-transition-phase=leave]').evaluate(node => node.inert), 'leaving page cannot receive focus')
  assert.equal(await page.locator('[data-transition-phase=enter]').evaluate(node => node.getAnimations()[0]?.effect?.getTiming().duration), 1200)
  await page.evaluate(() => window.pageMotionHarness.setMotion({ preset: 'fade', duration: 180, distance: 0 }))
  await page.waitForFunction(() => document.querySelector('main')?.dataset.pageMotion === 'fade')
  assert.equal(await page.locator('[data-transition-phase=enter]').getAttribute('data-transition-preset'), 'slide', 'in-flight preset is immutable')
  assert.equal(await page.locator('[data-transition-phase=enter]').evaluate(node => node.getAnimations()[0]?.effect?.getTiming().duration), 1200, 'in-flight duration is immutable')
  await page.evaluate(() => {
    window.pageMotionHarness.navigate(2)
    window.pageMotionHarness.navigate(3)
    window.pageMotionHarness.reduce('reduce')
  })
  await page.waitForFunction(() => location.hash === '#earth' && document.querySelector('[data-transition-phase=current] [data-testid=page-3]'))
  assert.equal(await page.locator('[data-transition-phase=current]').count(), 1)
  assert.equal(await page.locator('[data-transition-phase=leave]').count(), 0)
  assert.equal(await page.locator('main').evaluate(node => node.getAnimations({ subtree: true }).length), 0)
  assert.equal(await page.evaluate(() => history.length), initialHistory + 1, 'only the final queued target adds a history entry')
  await page.goBack()
  await page.waitForFunction(() => location.hash === '#home' && document.querySelector('[data-transition-phase=current] [data-testid=page-0]'))
  await page.evaluate(() => {
    window.pageMotionHarness.reduce('system')
    window.pageMotionHarness.setMotion({ preset: 'iris', duration: 1600, distance: 40 })
  })
  await page.waitForFunction(() => document.querySelector('main')?.dataset.pageMotion === 'iris')
  await page.evaluate(() => window.pageMotionHarness.navigate(1))
  await page.locator('[data-transition-phase=enter]').waitFor()
  const reducedAt = Date.now()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.waitForFunction(() => location.hash === '#about' && !document.querySelector('[data-transition-phase=enter]'))
  assert.ok(Date.now() - reducedAt < 1000, 'OS reduce must settle promptly rather than waiting the 1600ms animation')
  assert.equal(await page.locator('[data-transition-phase=current]').count(), 1)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.evaluate(() => window.pageMotionHarness.setMotion({ preset: 'original', duration: 900, distance: 90 }))
  await page.waitForFunction(() => document.querySelector('main')?.dataset.pageMotion === 'original')
  await page.evaluate(() => window.pageMotionHarness.navigate(2))
  await page.locator('.page-enter').waitFor({ state: 'attached' })
  assert.equal(await page.locator('[data-transition-phase=enter]').getAttribute('data-transition-preset'), 'original')
  assert.equal(await page.locator('.page-enter').evaluate(node => getComputedStyle(node).animationName), 'page-enter', 'legacy visual remains CSS based')
  await page.evaluate(() => {
    window.pageMotionHarness.navigate(3)
    window.pageMotionHarness.setMounted(false)
  })
  const hashBeforeUnmount = await page.evaluate(() => location.hash)
  await page.waitForTimeout(650)
  assert.equal(await page.locator('main').count(), 0)
  assert.equal(await page.evaluate(() => location.hash), hashBeforeUnmount, 'unmount cancels timers and queued navigation')
  assert.deepEqual(errors, [])
  console.log('PASS PageStack: WAAPI timing, immutable settings, inert leave layer, latest navigation/history, site and OS reduced motion mid-flight, original CSS and unmount cleanup.')
  await context.close()
} finally { await browser.close() }
