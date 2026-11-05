import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {mkdir} from 'node:fs/promises'
import {resolve} from 'node:path'
const {chromium}=createRequire(process.env.TTF_PLAYWRIGHT_PACKAGE_JSON)('playwright')
const browser=await chromium.launch({executablePath:process.env.TTF_BROWSER_PATH,headless:true})
const base=process.env.TTF_TEST_URL??'http://127.0.0.1:5173/'
const out=resolve('../../outputs/账号弹窗修复-20261027');await mkdir(out,{recursive:true})
try {
 for(const width of [904,390]) {
  const context=await browser.newContext({viewport:{width,height:871},reducedMotion:'reduce'})
  await context.addInitScript(()=>sessionStorage.setItem('ttf-intro-seen','1'))
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.goto(`${base}#about`)
  await page.locator('#about').waitFor()
  await page.keyboard.press('Control+Shift+A')
  const gate=page.getByRole('dialog',{name:'天图府 · 账号'})
  await gate.getByLabel('登录邮箱',{exact:true}).fill('reves')
  await gate.getByLabel('登录密码',{exact:true}).fill('LOCAL-DEMO-ONLY-1')
  await gate.getByTestId('account-login-submit').click();await gate.waitFor({state:'hidden'})
  await page.locator('#about').evaluate(e=>e.scrollTop=e.scrollHeight)
  for(const entry of ['账号资料','修改密码']) {
   await page.getByRole('button',{name:entry,exact:true}).click()
   const dialog=page.getByRole('dialog');await dialog.waitFor()
   const rect=await dialog.evaluate(e=>{const overlay=e.classList.contains('fixed')?e:e.parentElement;const r=overlay.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}})
   assert.ok(Math.abs(rect.x)<1&&Math.abs(rect.y)<1&&Math.abs(rect.width-width)<2&&Math.abs(rect.height-871)<2,`${entry} overlay must cover viewport: ${JSON.stringify(rect)}`)
   assert.ok(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth+1))
   if(entry==='账号资料') {
    await dialog.getByLabel('展示昵称',{exact:true}).click()
    assert.equal(await dialog.getByLabel('展示昵称',{exact:true}).evaluate(e=>document.activeElement===e),true)
    await page.screenshot({path:resolve(out,`profile-${width}.png`)})
    await dialog.getByRole('button',{name:'关闭资料编辑',exact:true}).click()
   } else await dialog.getByRole('button',{name:'取消',exact:true}).click()
   await dialog.waitFor({state:'hidden'})
  }
  assert.deepEqual(errors,[]);await context.close()
 }
 console.log('PASS: account/profile and password overlays cover viewport and remain usable at 904px and 390px on a scrolled About page. Isolated browser; no real account changes.')
} finally {await browser.close()}
