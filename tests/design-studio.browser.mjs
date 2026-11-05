import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const base = process.env.TTF_TEST_URL ?? 'http://127.0.0.1:5173/'
const output = 'output/design-studio'
const effects = [
  ['rise', '轻浮入场'], ['fade', '静谧叠化'], ['slide', '横向推幕'],
  ['curtain', '遮罩揭幕'], ['iris', '圆形开场'], ['zoom', '景深靠近'],
  ['split', '逐字升起'], ['blur', '由虚入实'], ['scramble', '字符归位'],
  ['fill', '墨色填充'], ['sheen', '一束扫光'], ['magnetic', '指针引力'],
  ['reveal', '滚动显影'], ['parallax', '叠层视差'],
]
const browser = await chromium.launch({
  executablePath: process.env.TTF_BROWSER_PATH ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
})
await mkdir(output, { recursive: true })
const packages = []

try {
  for (const width of [1440, 390, 320]) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      hasTouch: width < 700,
      isMobile: width < 700,
      reducedMotion: 'no-preference',
      acceptDownloads: true,
    })
    // 独立 context；不读取用户会话，并禁止向站点外部发送真实云端请求。
    await context.route('**/*', route => {
      const url = route.request().url()
      if (/^https?:/.test(url) && new URL(url).origin !== new URL(base).origin) return route.abort()
      return route.continue()
    })
    await context.addInitScript(() => {
      sessionStorage.setItem('ttf-intro-seen', '1')
      window.__studioCopied = ''
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: async text => { window.__studioCopied = text } },
      })
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    const center = async locator => {
      await locator.evaluate(node => node.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }))
    }
    const click = async locator => {
      await center(locator)
      await locator.click()
    }
    const choose = async id => {
      const title = effects.find(item => item[0] === id)?.[1]
      assert.ok(title, `Known test effect: ${id}`)
      await click(page.locator('.ds-recipe').filter({ hasText: title }))
      await page.waitForFunction(effect => document.querySelector('[data-testid="motion-preview"]')?.getAttribute('data-effect') === effect, id)
    }
    const assertLayout = async () => {
      assert.ok(await page.locator('#design-studio').evaluate(node => node.scrollWidth <= node.clientWidth + 1), `${width}px studio must not overflow horizontally`)
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width}px page must not overflow horizontally`)
    }

    await page.goto(`${base}#design-studio`)
    await page.getByRole('button', { name: '登录管理员账号' }).waitFor()
    assert.equal(await page.locator('.ds-recipes').count(), 0, 'guest must see the gate instead of editing controls')
    await click(page.getByRole('button', { name: '登录管理员账号' }))
    const gate = page.getByRole('dialog', { name: '天图府 · 账号' })
    await gate.getByLabel('登录邮箱', { exact: true }).fill('reves')
    await gate.getByLabel('登录密码', { exact: true }).fill('LOCAL-DEMO-ONLY-1')
    await gate.getByTestId('account-login-submit').click()
    await gate.waitFor({ state: 'hidden' })
    await page.locator('.ds-recipes').waitFor()
    assert.equal(await page.locator('.ds-recipe').count(), 14)
    assert.equal(await page.getByRole('combobox', { name: /参考来源/ }).locator('option').count(), 11)
    assert.match(await page.locator('.ds-summary').innerText(), /14\s*个可用效果/)
    assert.match(await page.locator('.ds-summary').innerText(), /10\s*个参考来源/)

    // 入口是真实管理员工具栏链接，返回后制作端仍可用。
    await click(page.locator('.ds-header').getByRole('link', { name: /返回网站/ }))
    await page.locator('#home').waitFor()
    await page.getByRole('link', { name: '动效制作', exact: true }).click()
    await page.locator('.ds-recipes').waitFor()
    await assertLayout()

    const categoryGroup = page.getByRole('group', { name: '效果类型' })
    for (const [name, count] of [['页面转场', 6], ['文字', 3], ['按钮', 3], ['滚动', 2]]) {
      await click(categoryGroup.getByRole('button', { name, exact: true }))
      assert.equal(await page.locator('.ds-recipe').count(), count, `Category ${name}`)
    }
    await click(categoryGroup.getByRole('button', { name: '全部', exact: true }))
    const sourceFilter = page.getByRole('combobox', { name: /参考来源/ })
    const sourceIds = await sourceFilter.locator('option').evaluateAll(options => options.map(option => option.value).filter(value => value !== 'all'))
    for (const sourceId of sourceIds) {
      await sourceFilter.selectOption(sourceId)
      assert.ok(await page.locator('.ds-recipe').count() > 0, `Source ${sourceId} should resolve to a distilled effect`)
    }
    await sourceFilter.selectOption('all')
    await page.getByLabel('查找效果', { exact: true }).fill('绝对不存在的效果__')
    assert.equal(await page.locator('.ds-recipe').count(), 0)
    assert.ok(await page.locator('.ds-empty').isVisible())
    await page.getByLabel('查找效果', { exact: true }).fill('')
    assert.equal(await page.locator('.ds-recipe').count(), 14)

    // 不使用全局 reduced-motion，确认十四项预览各有对应的运行时组件。
    for (const [id] of effects) {
      await choose(id)
      const preview = page.getByTestId('motion-preview')
      if (['rise', 'fade', 'slide', 'curtain', 'iris', 'zoom'].includes(id)) {
        assert.equal(await preview.locator('.dm-transition-layer').count(), 1)
      } else if (['split', 'blur', 'scramble'].includes(id)) {
        assert.equal(await preview.locator('.dm-motion-text').count(), 1)
      } else if (['fill', 'sheen', 'magnetic'].includes(id)) {
        assert.equal(await preview.locator('button.dm-motion-button').count(), 1)
      } else assert.equal(await preview.getByRole('region', { name: /滚动效果预览/ }).count(), 1)
    }

    await choose('curtain')
    await center(page.getByRole('slider', { name: '动效时长' }))
    await page.getByRole('slider', { name: '动效时长' }).fill('800')
    await click(page.getByRole('button', { name: '重播 ↻', exact: true }))
    assert.ok(await page.locator('.dm-transition-layer').evaluate(node => node.getAnimations().some(animation => animation.effect?.getTiming().duration === 800)), 'replay must start a real 800ms animation')
    await click(page.getByRole('button', { name: '应用此页面转场' }))
    await page.waitForFunction(() => document.querySelector('.ds-save')?.textContent?.includes('本机已保存'))
    assert.equal(await page.getByTestId('applied-transition').innerText(), '遮罩揭幕')
    assert.match(await page.locator('.ds-apply').innerText(), /800 ms/)
    await page.reload()
    await page.getByTestId('applied-transition').waitFor()
    assert.equal(await page.getByTestId('applied-transition').innerText(), '遮罩揭幕')
    assert.match(await page.locator('.ds-apply').innerText(), /800 ms/)
    await click(page.getByRole('link', { name: /到社团介绍试用/ }))
    await page.locator('#about').waitFor()
    await page.getByRole('link', { name: '动效制作', exact: true }).click()
    await page.getByTestId('applied-transition').waitFor()
    assert.equal(await page.getByTestId('applied-transition').innerText(), '遮罩揭幕')
    await click(page.getByRole('button', { name: '恢复原有转场', exact: true }))
    await page.waitForFunction(() => document.querySelector('[data-testid="applied-transition"]')?.textContent === '原有转场')
    await page.waitForFunction(() => document.querySelector('.ds-save')?.textContent?.includes('本机已保存'))

    const sentence = '寻🌏👩‍💻见山河'
    const reducePreview = page.getByRole('checkbox', { name: /预览减少动态/ })
    for (const id of ['split', 'blur', 'scramble']) {
      await choose(id)
      await page.getByLabel('预览文字', { exact: true }).fill(sentence)
      await center(page.getByTestId('motion-preview'))
      assert.equal(await page.locator('.dm-motion-text > .dm-visually-hidden').innerText(), sentence)
      if (id !== 'scramble') {
        const glyphs = await page.locator('.dm-glyph').allTextContents()
        assert.ok(glyphs.includes('👩‍💻'), 'joined emoji remains one visual grapheme')
        assert.equal(glyphs.join(''), sentence)
        await click(page.getByRole('button', { name: '重播 ↻', exact: true }))
        assert.notEqual(await page.locator('.dm-glyph').first().evaluate(node => getComputedStyle(node).animationName), 'none')
      } else {
        await click(page.getByRole('button', { name: '重播 ↻', exact: true }))
        await page.waitForFunction(text => document.querySelector('.dm-text-visual')?.textContent === text, sentence)
      }
      await reducePreview.check()
      assert.equal(await page.locator('.dm-text-visual').innerText(), sentence)
      if (id !== 'scramble') assert.equal(await page.locator('.dm-glyph').first().evaluate(node => getComputedStyle(node).animationName), 'none')
      await reducePreview.uncheck()
    }
    // 系统设置同样优先，不依赖制作端复选框。
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.waitForFunction(() => document.querySelector('.dm-motion-text')?.getAttribute('data-dm-reduced') === 'true')
    assert.equal(await page.locator('.dm-text-visual').innerText(), sentence)
    await page.emulateMedia({ reducedMotion: 'no-preference' })

    let clicks = 0
    for (const id of ['fill', 'sheen', 'magnetic']) {
      await choose(id)
      const button = page.locator('.dm-motion-button')
      await center(button)
      if (width < 700) await button.tap()
      else await button.click()
      clicks++
      assert.match(await page.getByTestId('motion-preview').getByRole('status').innerText(), new RegExp(`已触发 ${clicks} 次`))
      await button.focus()
      await page.keyboard.press('Enter')
      clicks++
      assert.match(await page.getByTestId('motion-preview').getByRole('status').innerText(), new RegExp(`已触发 ${clicks} 次`))
      assert.equal(await button.evaluate(node => node.tagName), 'BUTTON')
      if (id === 'magnetic' && width === 1440) {
        const anchor = page.locator('.dm-button-anchor')
        const box = await anchor.boundingBox()
        await page.mouse.move(box.x + box.width * .8, box.y + box.height * .35)
        await page.waitForFunction(() => Number.parseFloat(document.querySelector('.dm-motion-button')?.style.getPropertyValue('--dm-magnet-x') || '0') !== 0)
        await page.mouse.move(0, 0)
        await page.waitForFunction(() => document.querySelector('.dm-motion-button')?.style.getPropertyValue('--dm-magnet-x') === '0px')
      }
    }

    await choose('split')
    await click(page.locator('.ds-sources > summary'))
    const referenceLinks = page.locator('.ds-sources article a')
    assert.ok(await referenceLinks.count() > 0)
    for (const href of await referenceLinks.evaluateAll(links => links.map(link => link.href))) assert.ok(href.startsWith('https://'))
    await click(page.locator('.ds-source-directory > summary'))
    assert.equal(await page.locator('.ds-source-directory article').count(), 10)
    assert.equal(await page.locator('.ds-source-directory article a').count(), 20)
    await assertLayout()

    await click(page.getByRole('button', { name: '复制接入代码', exact: true }))
    assert.equal(await page.evaluate(() => window.__studioCopied), await page.getByRole('textbox', { name: 'React 接入代码' }).inputValue())
    await page.evaluate(() => { navigator.clipboard.writeText = async () => { throw new Error('Simulated clipboard denial') } })
    await click(page.getByRole('button', { name: '复制接入代码', exact: true }))
    assert.match(await page.locator('.ds-message').innerText(), /Ctrl\+C/)
    assert.ok(await page.getByRole('textbox', { name: 'React 接入代码' }).evaluate(node => node.selectionStart === 0 && node.selectionEnd === node.value.length))

    if (width === 1440) {
      for (const [id, category] of [['curtain', 'transition'], ['split', 'text'], ['magnetic', 'button'], ['parallax', 'scroll']]) {
        await choose(id)
        const pending = page.waitForEvent('download')
        await click(page.getByRole('button', { name: '下载完整源码包', exact: true }))
        const download = await pending
        assert.equal(download.suggestedFilename(), `tiantufu-motion-${id}.zip`)
        const path = resolve(output, `source-${id}.zip`)
        await download.saveAs(path)
        assert.equal(await download.failure(), null)
        const bytes = await readFile(path)
        assert.ok(bytes.byteLength > 1000)
        assert.deepEqual([...bytes.subarray(0, 4)], [0x50, 0x4b, 0x03, 0x04])
        packages.push({ category, effect: id, archive: path, expectedDirectory: resolve(output, `source-${id}`) })
      }
      await writeFile(resolve(output, 'source-packages.json'), JSON.stringify(packages, null, 2))
    }

    await choose('curtain')
    await page.locator('#design-studio').evaluate(node => { node.scrollTop = 0 })
    await assertLayout()
    await page.waitForFunction(() => [...(document.querySelector('.dm-transition-layer')?.getAnimations() ?? [])].every(animation => animation.playState === 'finished'))
    await page.screenshot({ path: `${output}/studio-${width}.png` })
    await center(page.getByTestId('motion-preview'))
    await page.screenshot({ path: `${output}/preview-${width}.png` })
    assert.deepEqual(errors, [])
    console.log(`PASS design studio ${width}px: guest/admin entry; 14 effects/10 sources; actual motion, Unicode text, buttons, clipboard, persisted transition and responsive layout.`)
    await context.close()
  }
  console.log('Source archives for independent compilation:', JSON.stringify(packages))
} finally {
  await browser.close()
}
