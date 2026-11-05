import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const base = process.env.TTF_TEST_URL ?? 'http://127.0.0.1:5173/'
const url = process.env.TTF_LEARNING_URL ?? new URL('learning/interaction-atlas/index.html', base).href
const browser = await chromium.launch({ executablePath: process.env.TTF_BROWSER_PATH ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
await mkdir('output/interaction-learning-qa', { recursive: true })
try {
  for (const width of [1440, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, isMobile: width < 700, hasTouch: width < 700 })
    const page = await context.newPage(), errors = [], external = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('request', request => {
      if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== new URL(url).origin) external.push(request.url())
    })
    await page.goto(url)
    await page.getByRole('heading', { name: '分类标签', exact: true }).waitFor()
    assert.equal(await page.locator('.learning-lesson').count(), 6)
    const tabs = page.locator('#tabs')
    const locked = tabs.getByLabel('锁定父级选择')
    await locked.check()
    await tabs.getByRole('tab').nth(1).click()
    assert.equal(await tabs.getByRole('tab').first().getAttribute('aria-selected'), 'true', 'controlled parent can reject a change')
    assert.match(await tabs.getByRole('status').innerText(), /最近 onChange：routes/)
    await locked.uncheck()
    await tabs.getByRole('tab').last().click()
    await page.getByRole('button', { name: '移除末项' }).click()
    assert.equal(await tabs.getByRole('tab').count(), 2)
    assert.equal(await tabs.getByRole('tab').first().getAttribute('aria-selected'), 'true', 'removed selection falls back to first item')
    await page.getByRole('button', { name: '清空列表' }).click()
    assert.equal(await tabs.getByRole('tab').count(), 0)
    assert.match(await tabs.innerText(), /暂无地图/)
    assert.ok(await page.locator('#flow').getByRole('button', { name: '下一张地图' }).isDisabled())
    assert.equal(await page.locator('#strip .atlas-strip-card').count(), 0)
    await page.getByRole('button', { name: '恢复列表' }).click()
    await tabs.getByRole('tab').first().focus()
    await page.keyboard.press('End')
    assert.equal(await tabs.getByRole('tab').last().getAttribute('aria-selected'), 'true')
    const scratch = page.locator('#scratch')
    await scratch.getByRole('button', { name: '直接揭晓' }).click()
    assert.match(await scratch.locator('.learning-state').innerText(), /累计揭晓：1/)
    await scratch.getByRole('button', { name: '换一张练习图' }).click()
    assert.equal(await scratch.locator('[data-revealed]').getAttribute('data-revealed'), 'false')
    await scratch.getByRole('button', { name: '直接揭晓' }).click()
    assert.match(await scratch.locator('.learning-state').innerText(), /累计揭晓：2/)
    const reaction = page.locator('#reactions').getByRole('button', { name: '喜欢', exact: true })
    await reaction.focus()
    await page.keyboard.press('Enter')
    assert.equal(await reaction.getAttribute('aria-pressed'), 'true')
    await page.keyboard.press('Enter')
    assert.equal(await reaction.getAttribute('aria-pressed'), 'false')
    const flow = page.locator('#flow')
    await flow.getByRole('button', { name: '下一张地图' }).click()
    await flow.getByRole('button', { name: /记录打开请求/ }).click()
    assert.match(await flow.locator('.learning-state').innerText(), /onOpen：routes/)
    await page.getByRole('checkbox', { name: /减少动态/ }).check()
    assert.equal(await page.locator('.atlas-fabric').first().evaluate(node => getComputedStyle(node).animationName), 'none')
    assert.equal(await page.locator('.atlas-poster').evaluate(node => getComputedStyle(node).transform), 'none')
    await page.locator('#poster').getByRole('button', { name: /查看作品/ }).click()
    assert.match(await page.locator('#poster .learning-state').innerText(), /调用次数：1/)
    await page.getByRole('checkbox', { name: /减少动态/ }).uncheck()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    assert.equal(await page.locator('.atlas-fabric').first().evaluate(node => getComputedStyle(node).animationName), 'none')
    for (const lesson of await page.locator('.learning-lesson').all()) {
      await lesson.locator('summary').first().click()
      assert.ok((await lesson.locator('pre').first().innerText()).includes('export function'))
      await lesson.locator('summary').last().click()
      assert.ok((await lesson.locator('pre').last().innerText()).includes("from 'react'") || (await lesson.locator('pre').last().innerText()).includes('useSelection'))
    }
    // 图片全部来自 data URI，滚动激活 lazy-loading 后逐张确认实际解码。
    for (const img of await page.locator('.learning-demo img').all()) {
      await img.scrollIntoViewIfNeeded()
      await img.evaluate(node => node.decode())
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no page overflow with code panels open')
    await page.getByRole('button', { name: '复位所有练习' }).click()
    assert.equal(await tabs.getByRole('tab').first().getAttribute('aria-selected'), 'true')
    assert.match(await scratch.locator('.learning-state').innerText(), /累计揭晓：0/)
    await page.evaluate(() => scrollTo(0, 0))
    await page.screenshot({ path: `output/interaction-learning-qa/learning-${width}.png` })
    assert.deepEqual(errors, [])
    assert.deepEqual(external, [], 'learning page must not request remote artwork or cloud services')
    assert.equal(await page.evaluate(() => localStorage.length), 0, 'no persistent demo writes')
    console.log(`PASS learning ${width}px: six runnable lessons, controlled state, list fallback, reset, sources, reduced motion and local-only images.`)
    await context.close()
  }
} finally { await browser.close() }
