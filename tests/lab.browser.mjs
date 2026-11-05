import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
const browser = await chromium.launch({ executablePath: process.env.TTF_BROWSER_PATH ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const base = process.env.TTF_TEST_URL ?? 'http://127.0.0.1:5173/'
await mkdir('output/lab', { recursive: true })
try {
  for (const width of [1440, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, hasTouch: width < 700, isMobile: width < 700, reducedMotion: width === 320 ? 'reduce' : 'no-preference' })
    await context.addInitScript(() => sessionStorage.setItem('ttf-intro-seen', '1'))
    const page = await context.newPage(), errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`${base}#lab`)
    await page.getByRole('tab').first().waitFor()
    await page.waitForTimeout(900)
    assert.equal(await page.locator('#lab .atlas-lab-section').count(), 6)
    assert.ok(await page.locator('#lab').evaluate(node => node.scrollWidth <= node.clientWidth + 1))
    const tabs = page.getByRole('tab')
    await tabs.first().focus(); await page.keyboard.press('ArrowRight')
    assert.equal(await tabs.nth(1).getAttribute('aria-selected'), 'true')
    await page.keyboard.press('End')
    assert.equal(await tabs.last().getAttribute('aria-selected'), 'true')
    const poster = page.locator('.atlas-poster')
    if (width === 1440) await poster.hover({ position: { x: 30, y: 40 } })
    if (width === 320) assert.equal(await poster.evaluate(node => getComputedStyle(node).transform), 'none')
    else if (width === 1440) assert.ok((await poster.getAttribute('style')).includes('--tilt-x'))
    const scratch = page.locator('.atlas-scratch')
    await scratch.getByRole('button', { name: '直接揭晓' }).focus(); await page.keyboard.press('Enter')
    assert.equal(await scratch.locator('[data-revealed]').getAttribute('data-revealed'), 'true')
    await scratch.getByRole('button', { name: '重新覆盖' }).click()
    assert.equal(await scratch.locator('[data-revealed]').getAttribute('data-revealed'), 'false')
    const canvas = scratch.locator('canvas')
    await canvas.scrollIntoViewIfNeeded()
    const bounds = await canvas.boundingBox()
    if (width === 1440) {
      for (let row = 25; row < bounds.height; row += 28) {
        await page.mouse.move(bounds.x + 5, bounds.y + row); await page.mouse.down()
        await page.mouse.move(bounds.x + bounds.width - 5, bounds.y + row, { steps: 12 }); await page.mouse.up()
      }
      assert.equal(await scratch.locator('[data-revealed]').getAttribute('data-revealed'), 'true')
    }
    const stripButtons = page.locator('.atlas-strip').getByRole('button')
    if (width < 700) await stripButtons.nth(1).tap()
    else { await stripButtons.nth(1).click(); await page.mouse.move(0, 0) }
    assert.equal(await stripButtons.nth(1).getAttribute('aria-pressed'), 'true')
    const reaction = page.getByRole('button', { name: '赞赏', exact: true })
    await reaction.scrollIntoViewIfNeeded()
    await page.waitForTimeout(700)
    if (width < 700) await reaction.tap(); else await reaction.click()
    await page.waitForFunction(() => document.querySelector('.atlas-reactions button')?.getAttribute('aria-pressed') === 'true', { }, { timeout: 3000 }).catch(async error => { await page.screenshot({ path: `output/lab/failure-${width}.png` }); throw error })
    assert.equal(await reaction.getAttribute('aria-pressed'), 'true')
    await reaction.press('Enter')
    assert.equal(await reaction.getAttribute('aria-pressed'), 'false')
    const flow = page.locator('.atlas-flow')
    await flow.getByRole('button', { name: '下一张地图' }).click()
    assert.equal(await flow.locator('.atlas-flow-card').nth(1).getAttribute('aria-pressed'), 'true')
    await flow.locator('.atlas-flow-card').nth(1).focus(); await page.keyboard.press('Home')
    assert.equal(await flow.locator('.atlas-flow-card').first().getAttribute('aria-pressed'), 'true')
    if (width < 700) {
      const track = flow.locator('.atlas-flow-track')
      await track.scrollIntoViewIfNeeded()
      const area = await track.boundingBox()
      const touchStart = { x: area.x + area.width - 15, y: area.y + 90 }
      const touchEnd = { x: area.x + 25, y: area.y + 90 }
      for (const point of [touchStart, touchEnd]) {
        assert.ok(await page.evaluate(({ x, y }) => Boolean(document.elementFromPoint(x, y)?.closest('.atlas-flow-track')), point), 'the real touch coordinates must hit the visible carousel')
      }
      await track.evaluate(node => {
        window.__labFlowTouch = []
        for (const type of ['pointerdown', 'pointerup', 'pointercancel']) {
          node.addEventListener(type, event => {
            window.__labFlowTouch.push({ type, pointerType: event.pointerType, x: event.clientX, y: event.clientY })
          }, { once: true })
        }
      })
      const session = await context.newCDPSession(page)
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touchStart] })
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [touchEnd] })
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      // CDP acknowledges input delivery; it does not wait for React's rendered selection.
      // Wait for the same user-visible result, while also proving a real touch swipe reached the component.
      await page.waitForFunction(() => {
        const trace = window.__labFlowTouch ?? []
        const start = trace.find(event => event.type === 'pointerdown' && event.pointerType === 'touch')
        const end = trace.find(event => event.type === 'pointerup' && event.pointerType === 'touch')
        return start && end && start.x - end.x > 45
          && document.querySelectorAll('.atlas-flow-card')[1]?.getAttribute('aria-pressed') === 'true'
      }, {}, { timeout: 3000 }).catch(async error => {
        await page.screenshot({ path: `output/lab/flow-touch-failure-${width}.png` })
        console.error('Carousel touch evidence:', await page.evaluate(() => ({
          events: window.__labFlowTouch,
          selection: Array.from(document.querySelectorAll('.atlas-flow-card'), node => node.getAttribute('aria-pressed')),
        })))
        throw error
      })
      assert.equal(await flow.locator('.atlas-flow-card').nth(1).getAttribute('aria-pressed'), 'true')
      await canvas.scrollIntoViewIfNeeded()
      const scratchBounds = await canvas.boundingBox()
      const point = { x: scratchBounds.x + scratchBounds.width / 2, y: scratchBounds.y + scratchBounds.height / 2 }
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] })
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: point.x + 30, y: point.y + 40 }] })
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      assert.ok(await canvas.evaluate(node => node.getContext('2d').getImageData(0, 0, 480, 640).data.some((alpha, index) => index % 4 === 3 && alpha === 0)))
      await session.detach()
    }
    await page.emulateMedia({ reducedMotion: 'reduce' })
    assert.equal(await page.locator('.atlas-fabric').first().evaluate(node => getComputedStyle(node).animationName), 'none')
    await page.locator('#lab').evaluate(node => { node.scrollTop = 0 })
    await page.screenshot({ path: `output/lab/lab-${width}.png` })
    await page.getByRole('link', { name: '← 返回天图府' }).click(); await page.locator('#home').waitFor()
    await page.goBack(); await page.locator('#lab').waitFor()
    assert.deepEqual(errors, [])
    console.log(`PASS lab ${width}px: six components, keyboard, scratch, touch, reactions, carousel, motion and routes.`)
    await context.close()
  }
} finally { await browser.close() }
