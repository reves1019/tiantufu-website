// Deploy in the existing project. Secrets stay in Edge Function settings / Vault.
import { createClient } from 'npm:@supabase/supabase-js@2.117.2'
import webpush from 'npm:web-push@3.6.7'

export function allowedPushEndpoint(value: string) {
  try {
    const u = new URL(value), h = u.hostname
    return u.protocol === 'https:' && !u.username && !u.password && (!u.port || u.port === '443') &&
      (h === 'fcm.googleapis.com' || h === 'updates.push.services.mozilla.com' ||
       h === 'wns2-paradise.notify.windows.com' || h.endsWith('.notify.windows.com') ||
       h === 'web.push.apple.com' || h.endsWith('.push.apple.com'))
  } catch { return false }
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
Deno.serve(async req => {
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405)
  const expected = Deno.env.get('PUSH_DISPATCH_SECRET'), supplied = req.headers.get('x-ttf-dispatch-secret')
  if (!expected || expected.length < 32 || !supplied) return json({ error: 'Unauthorized' }, 401)
  const hash = async (s: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))
  const [a,b] = await Promise.all([hash(expected),hash(supplied)])
  let difference = 0; for (let i=0;i<a.length;i++) difference |= a[i]^b[i]
  if (difference) return json({ error: 'Unauthorized' }, 401)
  const publicKey=Deno.env.get('WEB_PUSH_PUBLIC_KEY'), privateKey=Deno.env.get('WEB_PUSH_PRIVATE_KEY'), subject=Deno.env.get('WEB_PUSH_SUBJECT')
  if (!publicKey || !privateKey || !subject) return json({ error: 'Push configuration incomplete' }, 503)
  try {
    webpush.setVapidDetails(subject,publicKey,privateKey)
    const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}})
    const {data:queue,error}=await db.rpc('claim_push_notifications'); if(error)throw error
    let delivered=0,failed=0
    for(const notification of queue??[]) {
      const {data:visible,error:visibilityError}=await db.rpc('push_work_visible',{key:notification.work_key}); if(visibilityError)throw visibilityError
      if(!visible){const result=await db.from('gallery_notifications').update({processed_at:new Date().toISOString(),lease_until:null}).eq('id',notification.id);if(result.error)throw result.error;continue}
      let retry=false
      for(let offset=0;;offset+=1000) {
        const {data:subscriptions,error:subscriptionError}=await db.from('push_subscriptions').select('*').lte('created_at',notification.created_at).order('id').range(offset,offset+999);if(subscriptionError)throw subscriptionError
        if(!subscriptions?.length)break
        const users=[...new Set(subscriptions.map(s=>s.user_id))]
        const [profiles,interests,deliveries]=await Promise.all([
          db.from('profiles').select('id,status').in('id',users),db.from('member_interests').select('*').in('user_id',users),
          db.from('push_deliveries').select('*').eq('notification_id',notification.id).in('subscription_id',subscriptions.map(s=>s.id)),
        ]);if(profiles.error||interests.error||deliveries.error)throw profiles.error||interests.error||deliveries.error
        for(const s of subscriptions) {
          if(!profiles.data?.some(p=>p.id===s.user_id&&p.status==='approved'))continue
          const categories=interests.data?.find(i=>i.user_id===s.user_id)?.categories??[]
          if(categories.length&&!categories.includes(notification.category))continue
          if(!allowedPushEndpoint(s.endpoint))continue
          const previous=deliveries.data?.find(d=>d.subscription_id===s.id)
          if(previous?.delivered_at||previous?.attempts>=5)continue
          const attempt=await db.from('push_deliveries').upsert({notification_id:notification.id,subscription_id:s.id,attempts:(previous?.attempts??0)+1});if(attempt.error)throw attempt.error
          try {
            await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}},JSON.stringify({title:'天图府 · 新图入馆',body:`${notification.category} · ${notification.title}`,url:`./#palace?work=${encodeURIComponent(notification.work_key)}`,tag:notification.id}),{TTL:86400,timeout:12000})
            const mark=await db.from('push_deliveries').update({delivered_at:new Date().toISOString()}).eq('notification_id',notification.id).eq('subscription_id',s.id);if(mark.error)throw mark.error
            delivered++
          } catch(e) {
            const status=(e as {statusCode?:number}).statusCode
            if(status===404||status===410){const removal=await db.from('push_subscriptions').delete().eq('id',s.id);if(removal.error)throw removal.error}
            else {failed++;retry=true}
          }
        }
        const lease=await db.from('gallery_notifications').update({lease_until:new Date(Date.now()+300000).toISOString()}).eq('id',notification.id);if(lease.error)throw lease.error
        if(subscriptions.length<1000)break
      }
      const result=await db.from('gallery_notifications').update({processed_at:retry?null:new Date().toISOString(),lease_until:retry?new Date(Date.now()+60000).toISOString():null}).eq('id',notification.id);if(result.error)throw result.error
    }
    return json({delivered,failed})
  } catch { return json({error:'Push dispatch failed; check database migrations and server configuration.'},500) }
})
