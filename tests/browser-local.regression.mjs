import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

// Isolated browser storage only. Never connects to a real cloud project or
// edits the user's normal browser profile. Supply a bundled Playwright path.
if (!process.env.TTF_PLAYWRIGHT_PACKAGE_JSON) throw new Error('Set TTF_PLAYWRIGHT_PACKAGE_JSON to the installed Playwright package.json')
const { chromium } = createRequire(process.env.TTF_PLAYWRIGHT_PACKAGE_JSON)('playwright')
const browser = await chromium.launch({ executablePath: process.env.TTF_BROWSER_PATH, headless: true })
const base = process.env.TTF_TEST_URL ?? 'http://127.0.0.1:5173/'
const out = resolve('output/playwright')
await mkdir(out, { recursive: true })
const report = []
try {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } })
  await context.addInitScript(() => { try { sessionStorage.setItem('ttf-intro-seen', '1') } catch {} })
  const page = await context.newPage()
  page.setDefaultTimeout(8000)
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(base)
  await page.locator('#home h1').waitFor({ state: 'visible' })
  const gate = page.getByRole('dialog', { name: '天图府 · 账号' })
  const openGate = async () => { await page.keyboard.press('Control+Shift+A'); await gate.waitFor({ state: 'visible' }) }
  const login = async (username, password) => {
    await gate.getByTestId('account-login-tab').click()
    await gate.getByPlaceholder('用户名', { exact: true }).fill(username)
    await gate.getByPlaceholder('密码', { exact: true }).fill(password)
    await gate.getByTestId('account-login-submit').click()
  }
  await openGate()
  await gate.getByTestId('account-register-tab').click()
  await gate.getByPlaceholder('如 tiantu_fan').fill('qa_member')
  await gate.getByPlaceholder('如：山河绘图员').fill('验收成员')
  await gate.getByPlaceholder('设置登录密码').fill('qa-member-pass')
  await gate.getByTestId('account-register-submit').click()
  await gate.getByRole('button', { name: '去登录', exact: true }).waitFor()
  await login('qa_member', 'qa-member-pass')
  await gate.getByText(/审核/).waitFor()
  await login('reves', 'ttf-2026-reves')
  await gate.waitFor({ state: 'hidden' })
  await page.getByRole('button', { name: /账号管理（待审/ }).click()
  const accounts = page.getByRole('dialog')
  await accounts.getByRole('button', { name: '通过并生成主页', exact: true }).click()
  await accounts.getByText('已通过审核：主页与作品记录已保存到本机', { exact: true }).waitFor()
  await accounts.getByRole('button', { name: '关闭', exact: true }).click()
  report.push('Member registration stays pending; admin approval creates profile and portfolio.')

  await page.getByRole('button', { name: '内容管理', exact: true }).click()
  const manager = page.getByRole('dialog', { name: '内容管理' })
  await manager.getByRole('button', { name: '作品档案', exact: true }).click()
  await manager.getByRole('button', { name: /近东 1045 笙茗Reves/ }).click()
  const owner = manager.getByLabel('所属成员（改名后作品仍跟随本人）')
  await owner.selectOption('shengming-reves')
  await manager.getByLabel('作者署名').fill('独立署名')
  assert.equal(await owner.inputValue(), '', 'manual author changes clear obsolete owner ID')
  await owner.selectOption('shengming-reves')
  await manager.getByRole('button', { name: '品牌与首页素材', exact: true }).click()
  const brand = manager.getByPlaceholder('/uploads/xxx.png 或 https://… 或 data:image/…').first()
  const initialImage = await brand.inputValue()
  await manager.locator('input[type=file]').first().setInputFiles({ name: 'empty.png', mimeType: 'image/png', buffer: Buffer.alloc(0) })
  await manager.getByRole('alert').filter({ hasText: '图片文件为空' }).waitFor()
  assert.equal(await brand.inputValue(), initialImage, 'failed empty upload must preserve the previous image')
  await manager.locator('input[type=file]').first().setInputFiles({ name: 'not-an-image.txt', mimeType: 'text/plain', buffer: Buffer.from('invalid') })
  await manager.getByRole('alert').filter({ hasText: '请选择 PNG' }).waitFor()
  assert.equal(await brand.inputValue(), initialImage, 'rejected file type must preserve the previous image')
  // A delayed reader exposes the actual in-flight UI, without a real filesystem picker.
  await page.evaluate(() => {
    const read = FileReader.prototype.readAsDataURL
    FileReader.prototype.readAsDataURL = function (blob) {
      setTimeout(() => read.call(this, blob), 900)
    }
  })
  await manager.locator('input[type=file]').first().setInputFiles(resolve('public/atlas/roof-imperial-v1.png'))
  await brand.waitFor({ state: 'visible' })
  assert.equal(await brand.isDisabled(), true, 'path editing is locked during upload')
  assert.equal(await manager.getByRole('button', { name: '清除', exact: true }).first().isDisabled(), true, 'clear is locked during upload')
  await page.waitForFunction(() => document.querySelector('input[placeholder="/uploads/xxx.png 或 https://… 或 data:image/…"]')?.value.startsWith('data:image/'))
  const uploaded = await brand.inputValue()
  assert.ok(uploaded.length > 1_000_000, 'large-image fallback must exceed the old 1 MB limit')
  assert.equal(await brand.isDisabled(), false, 'field unlocks after upload')
  await manager.getByLabel('文字帘交互提示').fill('编辑保存验收：轻轻拨动文字')
  await manager.getByRole('button', { name: '关闭面板', exact: true }).click()
  await page.waitForTimeout(800)
  await page.reload()
  await page.getByRole('button', { name: '内容管理', exact: true }).click()
  await manager.getByRole('button', { name: '品牌与首页素材', exact: true }).click()
  assert.equal(await manager.getByLabel('文字帘交互提示').inputValue(), '编辑保存验收：轻轻拨动文字')
  assert.equal(await brand.inputValue(), uploaded, 'uploaded image survives refresh')
  await manager.getByRole('button', { name: '关闭面板', exact: true }).click()
  report.push('Admin author linkage, >1 MB upload and edited text survive refresh; failed uploads preserve images and in-flight editing is locked.')

  await page.getByRole('button', { name: '退出登录', exact: true }).click()
  await openGate()
  await login('qa_member', 'qa-member-pass')
  await gate.waitFor({ state: 'hidden' })
  await page.getByRole('button', { name: '编辑资料', exact: true }).click()
  const profile = page.getByRole('dialog', { name: '编辑公开资料' })
  await profile.getByLabel('展示昵称', { exact: true }).fill('我的未提交昵称')
  await profile.getByLabel('个人介绍', { exact: false }).fill('我正在填写的个人介绍，不能被同步刷新清除。')
  await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('ttf-site-store', 1)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const raw = await new Promise((resolve, reject) => {
      const request = db.transaction('kv', 'readonly').objectStore('kv').get('content-v4')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    db.close()
    const envelope = JSON.parse(raw)
    const member = envelope.content.members.find((entry) => entry.name === '验收成员')
    member.bio = '来自另一标签页的资料'
    const channel = new BroadcastChannel('ttf-site-sync-v1')
    channel.postMessage({ type: 'content', content: JSON.stringify(envelope.content) })
    setTimeout(() => channel.close(), 100)
  })
  await page.waitForTimeout(500)
  assert.equal(await profile.getByLabel('展示昵称', { exact: true }).inputValue(), '我的未提交昵称')
  assert.equal(await profile.getByLabel('个人介绍', { exact: false }).inputValue(), '我正在填写的个人介绍，不能被同步刷新清除。')
  await profile.getByRole('button', { name: '保存资料', exact: true }).click()
  await profile.getByText('资料已保存到当前设备。', { exact: true }).waitFor()
  await profile.getByRole('button', { name: '关闭资料编辑', exact: true }).click()
  assert.equal(await page.getByRole('button', { name: '内容管理', exact: true }).count(), 0)
  await page.reload()
  await page.getByRole('button', { name: '编辑资料', exact: true }).click()
  assert.equal(await profile.getByLabel('展示昵称', { exact: true }).inputValue(), '我的未提交昵称')
  assert.equal(await profile.getByLabel('个人介绍', { exact: false }).inputValue(), '我正在填写的个人介绍，不能被同步刷新清除。')
  report.push('Approved member sees own profile only; open drafts survive another-tab update and submitted edits survive refresh.')
  assert.deepEqual(errors, [], 'application page errors')
  await context.close()

  // Clean visitor profile: captures do not contain QA member data or uploads.
  for (const [name, width, height] of [['desktop', 1600, 1000], ['phone', 390, 844], ['pad', 820, 1180]]) {
    const visitor = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' })
    await visitor.addInitScript(() => { try { sessionStorage.setItem('ttf-intro-seen', '1') } catch {} })
    const view = await visitor.newPage()
    await view.goto(base)
    await view.locator('#home h1').waitFor({ state: 'visible' })
    await view.waitForTimeout(1400)
    const overflow = await view.evaluate(() => document.documentElement.scrollWidth > innerWidth)
    assert.equal(overflow, false, `${name} has horizontal overflow`)
    await view.screenshot({ path: resolve(out, `home-${name}.png`) })
    await view.goto(`${base}#works`)
    await view.locator('#works h1').waitFor({ state: 'visible' })
    await view.waitForTimeout(800)
    assert.equal(await view.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await view.screenshot({ path: resolve(out, `works-${name}.png`) })
    await visitor.close()
  }
  report.push('Clean visitor home/works screenshots: desktop, phone and pad; no horizontal overflow.')
  console.log(report.join('\n'))
  console.log('Scope: real browser + local IndexedDB/localStorage only. This does not verify live cloud auth, RLS, storage, or cross-device Realtime.')
} finally {
  await browser.close()
}
