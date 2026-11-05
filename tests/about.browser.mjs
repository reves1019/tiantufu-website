import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {mkdir} from 'node:fs/promises'
if(!process.env.TTF_PLAYWRIGHT_PACKAGE_JSON)throw new Error('Set TTF_PLAYWRIGHT_PACKAGE_JSON')
const {chromium}=createRequire(process.env.TTF_PLAYWRIGHT_PACKAGE_JSON)('playwright')
const browser=await chromium.launch({executablePath:process.env.TTF_BROWSER_PATH,headless:true})
const base=process.env.TTF_TEST_URL??'http://127.0.0.1:5173/'
await mkdir('output/playwright',{recursive:true})
try{
  for(const width of [1600,1280,1024,800,390,320]){
    const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'no-preference'})
    await context.addInitScript(()=>sessionStorage.setItem('ttf-intro-seen','1'))
    const page=await context.newPage(),errors=[]
    page.on('pageerror',e=>errors.push(e.message))
    await page.goto(`${base}#home`);await page.locator('#home h1').waitFor()
    await page.evaluate(()=>{location.hash='about'})
    const about=page.locator('#about');await about.locator('h1').waitFor();await page.waitForTimeout(1200)
    assert.equal(await about.evaluate(el=>el.scrollTop),0,`${width}: navigation must show page heading`)
    assert.equal(await about.locator('.linear-modal-trigger').evaluateAll(nodes=>nodes.includes(document.activeElement)),false)
    const measure=await about.locator('.society-chapters article').evaluateAll(nodes=>nodes.map(el=>({width:el.clientWidth,overflow:el.scrollWidth,titleWidth:el.querySelector('h2').getBoundingClientRect().width})))
    for(const card of measure){assert.ok(card.width>=Math.min(280,width-42),`${width}: card squeezed: ${JSON.stringify(card)}`);assert.ok(card.overflow<=card.width+1);assert.ok(card.titleWidth>=105)}
    assert.equal(await about.evaluate(el=>el.scrollWidth>el.clientWidth),false)
    await page.screenshot({path:`output/playwright/about-fixed-${width}.png`})
    const trigger=about.getByRole('button',{name:'打开全文 ↗',exact:true}).first()
    await trigger.scrollIntoViewIfNeeded();await page.waitForTimeout(400)
    const scrollBefore=await about.evaluate(el=>el.scrollTop)
    await trigger.click()
    const dialog=page.getByRole('dialog',{name:'社团宗旨',exact:true});await dialog.waitFor();await page.waitForTimeout(650)
    const dimensions=await dialog.evaluate(el=>({width:el.clientWidth,copy:el.querySelector('.linear-modal-copy').getBoundingClientRect().width,overflow:el.scrollWidth}))
    assert.ok(dimensions.copy>=dimensions.width-2,'Text-only modal must use full available width')
    assert.ok(dimensions.overflow<=dimensions.width+1)
    assert.equal(await page.locator('#root').evaluate(el=>el.inert),true)
    if([800,390].includes(width))await page.screenshot({path:`output/playwright/about-modal-fixed-${width}.png`})
    await page.keyboard.press('Tab');assert.equal(await page.getByRole('button',{name:'关闭窗口',exact:true}).evaluate(el=>el===document.activeElement),true)
    await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'})
    assert.equal(await trigger.evaluate(el=>el===document.activeElement),true)
    assert.ok(Math.abs(await about.evaluate(el=>el.scrollTop)-scrollBefore)<2)
    assert.equal(await page.locator('#root').evaluate(el=>el.inert),false)
    await page.reload();await about.locator('h1').waitFor();await page.waitForTimeout(900)
    assert.equal(await about.evaluate(el=>el.scrollTop),0,`${width}: direct route must show page heading`)
    assert.deepEqual(errors,[])
    console.log(`${width}px: route entry, readable cards, no horizontal overflow, full-width text modal, focus trap and scroll-preserving close passed.`)
    await context.close()
  }
}finally{await browser.close()}
