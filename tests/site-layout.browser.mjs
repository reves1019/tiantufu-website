import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
if (!process.env.TTF_PLAYWRIGHT_PACKAGE_JSON) throw new Error('Set TTF_PLAYWRIGHT_PACKAGE_JSON')
const {chromium}=createRequire(process.env.TTF_PLAYWRIGHT_PACKAGE_JSON)('playwright')
const browser=await chromium.launch({executablePath:process.env.TTF_BROWSER_PATH,headless:true})
const base=process.env.TTF_TEST_URL??'http://127.0.0.1:5173/'
try {
  for(const width of [1600,1024,768,390,320]) {
    const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'no-preference'})
    await context.addInitScript(()=>sessionStorage.setItem('ttf-intro-seen','1'))
    const page=await context.newPage(),errors=[]
    page.on('pageerror',error=>errors.push(error.message))
    await page.goto(`${base}#news`)
    const root=page.locator('#news')
    await root.locator('.journal-entry-title').first().waitFor()
    await page.waitForTimeout(1000)
    assert.equal(await root.evaluate(el=>el.scrollTop),0)
    const titles=await root.locator('.journal-entry-title').evaluateAll(nodes=>nodes.map(el=>{
      const text=el.firstElementChild,arrow=el.lastElementChild
      return {width:el.clientWidth,scroll:el.scrollWidth,textWidth:text.clientWidth,textScroll:text.scrollWidth,textRight:text.getBoundingClientRect().right,arrowLeft:arrow.getBoundingClientRect().left}
    }))
    for(const title of titles){
      assert.ok(title.scroll<=title.width+1,`${width}: title exceeds card`)
      assert.ok(title.textScroll<=title.textWidth+1,`${width}: title cannot wrap`)
      assert.ok(title.textRight<=title.arrowLeft,`${width}: title overlaps arrow`)
    }
    const trigger=root.locator('.journal-entry-title').first()
    await trigger.click()
    const dialog=page.getByRole('dialog');await dialog.waitFor();await page.waitForTimeout(600)
    assert.ok(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1))
    assert.ok(await dialog.locator('.linear-modal-copy').evaluate(el=>el.getBoundingClientRect().width>=el.parentElement.clientWidth-2))
    await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'})
    assert.ok(await trigger.evaluate(el=>el===document.activeElement))
    const filters=root.locator('.journal-filter button')
    if(await filters.count()>1){await filters.nth(1).click();assert.equal(await filters.nth(1).getAttribute('aria-pressed'),'true');await filters.first().click()}
    await page.goto(`${base}#community`);await page.locator('#community').waitFor();await page.waitForTimeout(900)
    await page.locator('#community').evaluate(el=>el.scrollTop=el.scrollHeight)
    await page.goto(`${base}#community?tab=mine`);await page.waitForTimeout(300)
    assert.equal(await page.getByRole('button',{name:'我的图库',exact:true}).getAttribute('aria-current'),'page')
    assert.equal(await page.locator('#community').evaluate(el=>el.scrollTop),0)
    await page.getByRole('button',{name:'府员新作',exact:true}).click()
    assert.equal(new URL(page.url()).hash,'#community')
    await page.goto(`${base}#faq`);await page.locator('#faq').waitFor();await page.waitForTimeout(900)
    for(const toggle of await page.locator('#faq button[aria-expanded]').all()){
      if(await toggle.getAttribute('aria-expanded')!=='true')await toggle.click()
      assert.equal(await toggle.getAttribute('aria-expanded'),'true')
      assert.ok(await page.locator('#faq').evaluate(el=>el.scrollWidth<=el.clientWidth+1))
    }
    assert.deepEqual(errors,[])
    console.log(`${width}px: news titles, news modal and filters, community hash/tab/scroll, FAQ expansion passed.`)
    await context.close()
  }
}finally{await browser.close()}
