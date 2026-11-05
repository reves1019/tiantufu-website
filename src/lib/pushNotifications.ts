import { getSupabaseClient } from './supabase'
const publicKey = (import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY ?? '').trim()
export function pushAvailability() {
  if (!window.isSecureContext || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return '当前浏览器暂不支持通知；手机端可能需要先添加到主屏幕。'
  if (!publicKey) return '通知服务尚未配置，管理员需要添加 Web Push 公钥并部署发送服务。'
  return ''
}
function keyBytes(base64: string) { const raw = atob(base64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4-base64.length%4)%4)); return Uint8Array.from(raw, c => c.charCodeAt(0)) }
export async function browserPushEnabled() {
  if (!('serviceWorker' in navigator)) return false
  const registration = await navigator.serviceWorker.getRegistration()
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return false
  const client = await getSupabaseClient()
  if (!client) return false
  const { data, error } = await client.from('push_subscriptions').select('id').eq('endpoint', subscription.endpoint).maybeSingle()
  if (error) return false
  return !!data
}
export async function enableBrowserPush() {
  const unavailable = pushAvailability(); if (unavailable) throw new Error(unavailable)
  // Request permission synchronously from the click before awaiting network authentication.
  const permission = Notification.requestPermission()
  const client = await getSupabaseClient(); if (!client) throw new Error('请先连接云端注册服务')
  const { data: { user } } = await client.auth.getUser(); if (!user) throw new Error('请先登录')
  // Permission is requested only following the explicit subscription button click.
  if (await permission !== 'granted') throw new Error('通知权限未开启。你仍可在站内查看推荐；可在浏览器网站设置中更改权限。')
  await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription() ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) })
  const values = subscription.toJSON()
  const { error } = await client.from('push_subscriptions').upsert({ user_id: user.id, endpoint: subscription.endpoint, p256dh: values.keys?.p256dh, auth: values.keys?.auth }, { onConflict: 'endpoint' })
  if (error) { await subscription.unsubscribe(); throw new Error(error.message) }
}
export async function disableBrowserPush() {
  const client = await getSupabaseClient(), registration = await navigator.serviceWorker.getRegistration(), subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return
  if (client) { const { error } = await client.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint); if (error) throw new Error(error.message) }
  await subscription.unsubscribe()
}
