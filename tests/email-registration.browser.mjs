import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {resolve} from 'node:path'
import {mkdir} from 'node:fs/promises'
const {chromium}=createRequire(process.env.TTF_PLAYWRIGHT_PACKAGE_JSON)('playwright')
const browser=await chromium.launch({executablePath:process.env.TTF_BROWSER_PATH,headless:true})
const shots=resolve('../../outputs/简化注册验收-20261026');await mkdir(shots,{recursive:true})
try {
 for(const cloud of [false,true]) {
  const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'})
  await context.addInitScript(()=>sessionStorage.setItem('ttf-intro-seen','1'))
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000)
  let profile,user,submitted,verified=false,activations=0
  const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'}
  if(cloud) {
   if(context.routeWebSocket) await context.routeWebSocket('**registration-test.supabase.co/**',ws=>ws.close())
   await context.route('https://registration-test.supabase.co/**',async route=>{
    const req=route.request(),url=new URL(req.url()),body=req.postDataJSON()
    const send=(data,status=200)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(data)})
    if(req.method()==='OPTIONS') return send({})
    if(url.pathname==='/auth/v1/signup') {
      submitted=body
      user={id:'80000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',email:body.email,user_metadata:body.data,app_metadata:{provider:'email',providers:['email']},created_at:new Date().toISOString()}
      profile={id:user.id,username:body.data.username,display_name:body.data.display_name,role:'member',status:'pending',member_id:null,avatar:'',bio:'',topic:null,created_at:user.created_at,updated_at:user.created_at}
      return send({user,session:null})
    }
    if(url.pathname==='/auth/v1/verify') {
      if(body.token!=='123456') return send({msg:'Token expired',code:'otp_expired'},403)
      verified=true;user.email_confirmed_at=new Date().toISOString()
      const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url')
      const token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:user.id,aud:'authenticated',role:'authenticated',email:user.email,exp:Math.floor(Date.now()/1000)+3600,amr:[{method:'otp'}]})}.mock-signature`
      return send({access_token:token,token_type:'bearer',expires_in:3600,refresh_token:'mock-refresh',user})
    }
    if(url.pathname==='/auth/v1/user') return send(user)
    if(url.pathname==='/auth/v1/logout') return route.fulfill({status:204,headers})
    if(url.pathname==='/rest/v1/rpc/activate_email_member') {activations++;if(verified)profile.status='approved';return send(verified)}
    if(url.pathname==='/rest/v1/rpc/community_access') return send({canEdit:verified,canInteract:verified,cloud:true})
    if(url.pathname==='/rest/v1/profiles') return send(profile ? [profile] : [])
    if(url.pathname==='/rest/v1/site_content') return send([])
    return send([])
   })
  }
  const base=cloud?(process.env.TTF_CLOUD_TEST_URL??'http://127.0.0.1:5176/'):(process.env.TTF_TEST_URL??'http://127.0.0.1:5173/')
  await page.goto(`${base}#studio`)
  await page.getByRole('button',{name:'登录，进入我的创作室 ↗',exact:true}).click()
  const gate=page.getByRole('dialog',{name:'天图府 · 账号'})
  await gate.getByTestId('account-register-tab').click()
  assert.equal(await gate.locator('input').count(),3)
  assert.equal(await gate.locator('textarea').count(),0)
  assert.doesNotMatch(await gate.innerText(),/白名单|管理员审核|申请说明|QQ 免注册|QQ 号|Supabase|注册成员/)
  await gate.getByLabel('注册邮箱',{exact:true}).fill(cloud?'123450099@qq.com':'visitor@example.com')
  await gate.getByLabel('昵称',{exact:true}).fill(cloud?'云端创作者':'交流访客')
  await gate.getByLabel('注册密码',{exact:true}).fill('local-fixture-pass')
  await page.screenshot({path:resolve(shots,cloud?'register-cloud.png':'register-desktop.png')})
  if(!cloud) {await page.setViewportSize({width:320,height:740});assert.equal(await gate.evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);await page.screenshot({path:resolve(shots,'register-320.png')})}
  await gate.getByTestId('account-register-submit').click()
  if(cloud) {
    await gate.getByLabel('邮箱验证码',{exact:true}).waitFor()
    assert.equal(submitted.email,'123450099@qq.com');assert.equal(submitted.data.display_name,'云端创作者');assert.match(submitted.data.username,/^user_/)
    assert.equal(submitted.data.username.includes('123450099'),false)
    assert.equal(submitted.data.role,undefined)
    await gate.getByLabel('邮箱验证码',{exact:true}).fill('000000')
    await gate.getByRole('button',{name:'验证邮箱',exact:true}).click()
    await gate.getByRole('alert').filter({hasText:'验证码无效或已过期'}).waitFor()
    assert.equal(profile.status,'pending')
    await gate.getByLabel('邮箱验证码',{exact:true}).fill('123456')
    await gate.getByRole('button',{name:'验证邮箱',exact:true}).click()
    await gate.waitFor({state:'hidden'})
    await page.getByRole('button',{name:'＋ 发布帖子',exact:true}).waitFor()
    await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='＋ 发布帖子'&&!b.disabled))
    assert.ok(activations>0);assert.equal(profile.status,'approved')
    console.log('PASS cloud mock: three fields → signup → invalid OTP error → valid OTP → activation → creator dashboard. Real SDK/network contract; no real SMTP/backend.')
  } else {
    await gate.getByRole('button',{name:'去登录',exact:true}).click()
    assert.equal(await gate.getByLabel('登录邮箱',{exact:true}).inputValue(),'visitor@example.com')
    await gate.getByLabel('登录密码',{exact:true}).fill('local-fixture-pass')
    await gate.getByTestId('account-login-submit').click();await gate.waitFor({state:'hidden'})
    await page.getByRole('button',{name:'＋ 发布帖子',exact:true}).waitFor()
    assert.equal(await page.getByRole('button',{name:'＋ 发布帖子',exact:true}).isDisabled(),true,'Local unverified visitor must not acquire creator rights')
    await page.reload();await page.locator('.studio-profile h2').filter({hasText:'交流访客'}).waitFor()
    console.log('PASS local: clean registration form at desktop/320px, email login without manual review, persistence, no automatic creator escalation.')
  }
  assert.deepEqual(errors,[]);await context.close()
 }
} finally {await browser.close()}
