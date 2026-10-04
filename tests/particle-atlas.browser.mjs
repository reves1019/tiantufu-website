import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
const { chromium } = createRequire(process.env.TTF_PLAYWRIGHT_PACKAGE_JSON)('playwright')
const browser = await chromium.launch({ executablePath: process.env.TTF_BROWSER_PATH, headless: true })
await mkdir('outputs/particle-atlas', { recursive: true })
try {
  for (const [name, width, height, reduced] of [['desktop', 1600, 1000, false], ['mobile', 390, 844, false], ['tablet', 820, 1180, false], ['reduced', 1440, 900, true]]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference', hasTouch: name !== 'desktop' })
    await context.addInitScript(() => { try { sessionStorage.setItem('ttf-intro-seen', '1') } catch {} })
    const page = await context.newPage(), errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', msg => { if (msg.type() === 'error' && /THREE|Shader|WebGL|ERROR: 0/.test(msg.text())) errors.push(msg.text()) })
    await page.goto('http://127.0.0.1:5173/#earth')
    await page.waitForFunction(() => document.querySelector('[data-particle-state]')?.dataset.particleState === 'ready')
    const stage = page.locator('.particle-room-stage')
    await stage.scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)
    const getProbe = () => page.evaluate(() => { const p = window.__ttfParticleAtlas(); delete p.hold; return p })
    const initial = await getProbe()
    assert.equal(initial.plate, 'compass')
    assert.equal(initial.drawCalls, 1)
    assert.equal(initial.count, width < 768 ? 12288 : 27648)
    assert.equal(initial.reduced, reduced)
    assert.equal(await page.locator('.particle-plate-switcher button').count(), 4)
    if (width >= 1024) {
      await page.getByRole('button', { name: '展开关键词目录', exact: true }).press('Enter')
      assert.equal(await page.getByRole('button', { name: '收起关键词目录', exact: true }).getAttribute('aria-expanded'), 'true')
      await page.getByRole('button', { name: '#05 探索', exact: true }).click()
      await page.getByRole('button', { name: '收起关键词目录', exact: true }).press('Enter')
      assert.equal(await page.getByRole('button', { name: '#05 探索', exact: true }).count(), 0, 'closed drawer is not a keyboard or pointer barrier')
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await page.screenshot({ path: `outputs/particle-atlas/${name}-compass.png` })
    if (!reduced) {
      const box = await stage.boundingBox()
      await page.mouse.move(box.x + box.width * .7, box.y + box.height * .4, { steps: 20 })
      await page.waitForTimeout(400)
      const moved = await getProbe()
      assert.ok(moved.pointer[2] > .9)
      assert.ok(Math.abs(moved.camera[0]) > .01)
      assert.ok(moved.frameCount > initial.frameCount)
    } else {
      // The keyword drawer intentionally requests a static redraw when focus changes.
      // Measure idle *after* those real input updates have settled, not before them.
      await page.waitForTimeout(100)
      const settled = await getProbe()
      await page.waitForTimeout(350)
      const idle = await getProbe()
      assert.equal(idle.frameCount, settled.frameCount)
      assert.equal(idle.running, false)
    }
    await page.locator('.particle-plate-switcher button').nth(1).click()
    await page.waitForFunction(() => window.__ttfParticleAtlas()?.plate === 'w-shengming-1')
    if (!reduced) {
      await page.waitForTimeout(450)
      const mid = await getProbe()
      assert.ok(mid.progress > 0 && mid.progress < 1, 'morph must have a real intermediate frame')
      await stage.scrollIntoViewIfNeeded()
      await page.screenshot({ path: `outputs/particle-atlas/${name}-morph.png` })
    }
    await stage.scrollIntoViewIfNeeded()
    await page.waitForFunction(() => window.__ttfParticleAtlas().progress === 1)
    await page.screenshot({ path: `outputs/particle-atlas/${name}-map.png` })
    await page.getByRole('button', { name: '展开这幅地图', exact: true }).click()
    await page.locator('.map-reader-image').evaluate(img => img.decode())
    assert.ok((await page.locator('.map-reader-image').getAttribute('src')).includes('collection/'))
    await page.keyboard.press('Escape')
    await page.locator('.particle-plate-switcher button').nth(3).click()
    await page.waitForFunction(() => window.__ttfParticleAtlas()?.plate === 'w-baicai-1')
    await page.locator('.particle-plate-switcher button').nth(0).click()
    await stage.scrollIntoViewIfNeeded()
    await page.waitForFunction(() => window.__ttfParticleAtlas()?.plate === 'compass' && window.__ttfParticleAtlas()?.progress === 1)
    // A real wheel must scroll inside this page, not change routes.
    await page.mouse.wheel(0, 300)
    await page.waitForTimeout(250)
    assert.equal(await page.evaluate(() => location.hash), '#earth')
    if (width < 768) {
      await stage.scrollIntoViewIfNeeded()
      const box = await stage.boundingBox(), x = box.x + box.width / 2, y = box.y + box.height / 2
      const cdp = await context.newCDPSession(page)
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
      for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + i * 6, y }] })
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await page.waitForTimeout(150)
      assert.equal(await page.evaluate(() => location.hash), '#earth', 'touch drag must not open a random work')
    }
    await page.keyboard.press('2')
    await page.waitForFunction(() => document.documentElement.dataset.page === 'about')
    await page.waitForTimeout(900)
    assert.equal(await page.locator('canvas[data-particle-atlas]').count(), 0, 'canvas disposed on navigation')
    assert.deepEqual(errors, [])
    console.log(name, 'morph/pointer or reduced/touch/map-reader/disposal passed', JSON.stringify(initial))
    await context.close()
  }
} finally { await browser.close() }
