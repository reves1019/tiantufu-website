import assert from 'node:assert/strict'
import { chromium } from 'playwright'

// Requires the Vite dev server, as do the other source-level browser fixtures.
const base = process.env.TTF_TEST_URL ?? 'http://127.0.0.1:5173/'
const browser = await chromium.launch({
  executablePath: process.env.TTF_BROWSER_PATH ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
})

try {
  for (const width of [900, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'no-preference' })
    await context.route('**/*', route => {
      const url = route.request().url()
      if (/^https?:/.test(url) && new URL(url).origin !== new URL(base).origin) return route.abort()
      return route.continue()
    })
    const page = await context.newPage(), errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(new URL('tests/fixtures/design-primitives.html', base).href)
    await page.waitForFunction(() => Boolean(window.designPrimitivesHarness))

    const settleRender = async revision => {
      await page.waitForFunction(value => Number(document.querySelector('[data-fixture-revision]')?.dataset.fixtureRevision) === value, revision)
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    }
    const render = async (mode, props = {}) => {
      const revision = await page.evaluate(({ mode, props }) => window.designPrimitivesHarness.render(mode, props), { mode, props })
      await settleRender(revision)
    }
    const settledOpacity = async locator => {
      await locator.evaluate(async node => {
        await Promise.all(node.getAnimations().map(animation => animation.finished.catch(() => {})))
      })
      assert.equal(await locator.evaluate(node => getComputedStyle(node).opacity), '1', 'settled content must remain visible')
    }

    // Invalid values reach the exported components directly, bypassing studio inputs.
    for (const mode of ['stage', 'layer']) {
      for (const invalid of ['negative', 'nonfinite']) {
        const revision = await page.evaluate(({ mode, invalid }) => window.designPrimitivesHarness.render(mode, {
          variant: 'rise',
          options: { duration: invalid === 'negative' ? -1 : Infinity, distance: invalid === 'negative' ? Infinity : NaN, stagger: 35, color: '#c9a569' },
        }), { mode, invalid })
        await settleRender(revision)
        const layer = page.locator('.dm-transition-layer')
        const motion = await layer.evaluate(node => node.getAnimations().map(animation => ({
          duration: animation.effect.getTiming().duration,
          frames: animation.effect.getKeyframes(),
        })))
        assert.ok(motion.length > 0, `${mode}: valid fallback animation must still run`)
        assert.equal(motion[0].duration, invalid === 'negative' ? 160 : 600)
        assert.ok(!/NaN|Infinity/.test(JSON.stringify(motion[0].frames)), 'invalid distances cannot enter keyframes')
        await settledOpacity(layer)
      }
    }

    // The same DOM layer changes phase; reduced motion must not bypass inert.
    await render('layer', { phase: 'leave', reduced: true })
    const leaving = page.locator('.dm-transition-layer')
    assert.equal(await leaving.getAttribute('aria-hidden'), 'true')
    assert.ok(await leaving.evaluate(node => node.inert))
    await page.locator('#layer-button').evaluate(button => button.focus())
    assert.notEqual(await page.evaluate(() => document.activeElement?.id), 'layer-button')
    assert.equal(await leaving.evaluate(node => node.getAnimations().length), 0)
    await render('layer', { phase: 'enter', reduced: true })
    assert.equal(await leaving.evaluate(node => node.inert), false)
    await page.locator('#layer-button').focus()
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'layer-button')

    const revision = await page.evaluate(() => window.designPrimitivesHarness.render('scroll', {
      variant: 'reveal',
      options: { duration: -1, distance: Infinity, stagger: 35, color: '#c9a569' },
    }))
    await settleRender(revision)
    const region = page.getByRole('region', { name: /滚动效果预览/ })
    const cards = region.locator('.dm-scroll-card')
    assert.equal(await cards.count(), 3)
    for (let index = 0; index < 3; index++) {
      await cards.nth(index).evaluate(card => {
        const viewport = card.closest('.dm-scroll-scene')
        viewport.scrollTop += card.getBoundingClientRect().top - viewport.getBoundingClientRect().top - 24
      })
      await page.waitForFunction(index => document.querySelectorAll('.dm-scroll-card')[index]?.style.opacity === '1', index)
      await settledOpacity(cards.nth(index))
    }
    assert.deepEqual(await cards.evaluateAll(nodes => nodes.map(node => getComputedStyle(node).opacity)), ['1', '1', '1'])
    await region.evaluate(node => { node.scrollTop = 0 })
    await settledOpacity(cards.first())
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width}px primitives must fit horizontally`)

    await render('scroll', { variant: 'parallax' })
    const offsets = () => cards.evaluateAll(nodes => nodes.map(node => node.style.getPropertyValue('--dm-scroll-offset')))
    await page.waitForFunction(() => Boolean(document.querySelector('.dm-scroll-card')?.style.getPropertyValue('--dm-scroll-offset')))
    const before = await offsets()
    await region.focus()
    await page.keyboard.press('PageDown')
    await page.waitForFunction(previous => {
      const values = [...document.querySelectorAll('.dm-scroll-card')].map(node => node.style.getPropertyValue('--dm-scroll-offset'))
      return values.some((value, index) => value !== previous[index])
    }, before)
    assert.ok((await offsets()).every(value => Number.isFinite(Number.parseFloat(value))), 'scroll coordinates remain finite')

    // Both supported preference sources must stop and reset existing parallax.
    for (const preference of ['system', 'site']) {
      if (preference === 'system') await page.emulateMedia({ reducedMotion: 'reduce' })
      else await page.evaluate(() => { document.documentElement.dataset.motion = 'reduced' })
      await page.waitForFunction(() => document.querySelector('.dm-scroll-scene')?.dataset.reduced === 'true')
      assert.deepEqual(await offsets(), ['', '', ''], 'reducing motion clears stale scroll offsets')
      assert.deepEqual(await region.locator('.dm-scroll-art, .dm-scroll-copy').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).transform)), Array(6).fill('none'))
      await region.evaluate(node => { node.scrollTop = 280 })
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
      assert.deepEqual(await offsets(), ['', '', ''], 'scrolling cannot restart motion while reduced')
      if (preference === 'system') await page.emulateMedia({ reducedMotion: 'no-preference' })
      else await page.evaluate(() => { delete document.documentElement.dataset.motion })
      await page.waitForFunction(() => document.querySelector('.dm-scroll-scene')?.dataset.reduced === 'false'
        && Boolean(document.querySelector('.dm-scroll-card')?.style.getPropertyValue('--dm-scroll-offset')))
    }

    // Retain detached elements so stale listeners/rAF writes remain observable.
    await page.evaluate(() => {
      window.detachedMotionViewport = document.querySelector('.dm-scroll-scene')
      window.detachedMotionCards = [...document.querySelectorAll('.dm-scroll-card')]
    })
    await render('empty')
    await page.evaluate(() => {
      window.detachedMotionViewport.scrollTop = 100
      window.detachedMotionViewport.dispatchEvent(new Event('scroll'))
    })
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    assert.deepEqual(await page.evaluate(() => window.detachedMotionCards.map(node => node.style.getPropertyValue('--dm-scroll-offset'))), ['', '', ''], 'unmounted scroll effects do not write into detached elements')
    assert.deepEqual(errors, [])
    console.log(`PASS design primitives ${width}px: invalid options, inert leave/reentry, all reveal cards, keyboard parallax, system/site reduced motion and unmount cleanup.`)
    await context.close()
  }
} finally { await browser.close() }
