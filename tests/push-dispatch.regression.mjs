import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {webcrypto} from 'node:crypto'
import vm from 'node:vm'
import ts from 'typescript'
const source=await readFile('supabase/functions/push-dispatch/index.ts','utf8')
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023}}).outputText
const fakeSecret='test-only-dispatch-secret-that-is-long-enough'
let handler,clients=0,sends=[],writes=[]
const subscriptions=[
  {id:'s1',user_id:'u1',endpoint:'https://fcm.googleapis.com/fcm/send/1',p256dh:'test',auth:'test'},
  {id:'s2',user_id:'u2',endpoint:'https://fcm.googleapis.com/fcm/send/2',p256dh:'test',auth:'test'},
  {id:'s3',user_id:'u3',endpoint:'https://127.0.0.1/private',p256dh:'test',auth:'test'},
  {id:'s4',user_id:'u4',endpoint:'https://fcm.googleapis.com/fcm/send/4',p256dh:'test',auth:'test'},
]
const queue=[{id:'n1',work_key:'archive:w1',title:'测试地图',category:'历史地图',created_at:'2026-10-25T00:00:00Z'}]
const records={push_subscriptions:subscriptions,profiles:[...subscriptions.map(s=>({id:s.user_id,status:s.user_id==='u4'?'pending':'approved'}))],member_interests:[{user_id:'u1',categories:['历史地图']},{user_id:'u2',categories:['地形地图']}],push_deliveries:[]}
const client={rpc:async(name)=>({data:name==='claim_push_notifications'?queue:true,error:null}),from(table){let mode='select',value;const chain={select(){return chain},lte(){return chain},order(){return chain},range(){return chain},in(){return chain},eq(){return chain},update(v){mode='update';value=v;return chain},upsert(v){mode='upsert';value=v;return chain},delete(){mode='delete';return chain},then(resolve,reject){if(mode!=='select')writes.push({table,mode,value});return Promise.resolve({data:records[table]??[],error:null}).then(resolve,reject)}};return chain}}
const env={PUSH_DISPATCH_SECRET:fakeSecret,WEB_PUSH_PUBLIC_KEY:'test-public-key',WEB_PUSH_PRIVATE_KEY:'test-private-key',WEB_PUSH_SUBJECT:'https://example.invalid',SUPABASE_URL:'https://example.invalid',SUPABASE_SERVICE_ROLE_KEY:'fake-test-key'}
const exports={}
vm.runInNewContext(compiled,{exports,require:(name)=>name.startsWith('npm:@supabase')?{createClient:()=>{clients++;return client}}:{__esModule:true,default:{setVapidDetails(){},async sendNotification(subscription,payload){sends.push({subscription,message:JSON.parse(payload)})}}},Deno:{env:{get:key=>env[key]},serve:fn=>{handler=fn}},crypto:webcrypto,TextEncoder,URL,Response})
assert.equal(exports.allowedPushEndpoint('http://127.0.0.1'),false)
assert.equal(exports.allowedPushEndpoint('https://fcm.googleapis.com.evil.example/'),false)
assert.equal(exports.allowedPushEndpoint('https://user:pass@fcm.googleapis.com/'),false)
assert.equal(exports.allowedPushEndpoint('https://fcm.googleapis.com:8443/'),false)
assert.equal(exports.allowedPushEndpoint('https://web.push.apple.com/test'),true)
assert.equal((await handler(new Request('https://example.invalid',{method:'POST'}))).status,401)
assert.equal(clients,0)
assert.equal((await handler(new Request('https://example.invalid',{method:'POST',headers:{'x-ttf-dispatch-secret':'wrong'}}))).status,401)
assert.equal(clients,0)
const response=await handler(new Request('https://example.invalid',{method:'POST',headers:{'x-ttf-dispatch-secret':fakeSecret}}))
assert.equal(response.status,200)
assert.equal(sends.length,1,'Only approved users with matching interests and a valid push-provider endpoint receive a push')
assert.equal(sends[0].subscription.endpoint,subscriptions[0].endpoint)
assert.ok(sends[0].message.url.startsWith('./#palace?work='))
assert.ok(writes.some(w=>w.table==='push_deliveries'&&w.value?.delivered_at))
assert.ok(writes.some(w=>w.table==='gallery_notifications'&&w.value?.processed_at))

const events={},notifications=[],opened=[]
vm.runInNewContext(await readFile('public/sw.js','utf8'),{URL,self:{location:{origin:'https://tiantufu.example'},registration:{scope:'https://tiantufu.example/',showNotification:async(...args)=>notifications.push(args)},addEventListener:(name,fn)=>{events[name]=fn},clients:{matchAll:async()=>[],openWindow:async url=>opened.push(url)}}})
let waited
events.push({data:{json:()=>({title:'新图',body:'一幅地图',url:'./#palace'})},waitUntil:p=>{waited=p}});await waited
assert.equal(notifications[0][0],'新图')
events.notificationclick({notification:{close(){},data:{url:'https://evil.example'}},waitUntil:p=>{waited=p}})
assert.equal(opened.length,0)
events.notificationclick({notification:{close(){},data:{url:'./#palace?work=archive%3Aw1'}},waitUntil:p=>{waited=p}});await waited
assert.equal(opened[0],'https://tiantufu.example/#palace?work=archive%3Aw1')
assert.deepEqual(Object.keys(events),['push','notificationclick'])
console.log('Dispatcher authentication, endpoint allowlist, subscription interests, approval filtering, delivery tracking, visible service-worker notifications and same-origin navigation passed with mocked services.')
