import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { useContent } from '../../lib/contentStore'
import { browserPushEnabled, disableBrowserPush, enableBrowserPush, pushAvailability } from '../../lib/pushNotifications'
import { communityError } from '../../lib/community'
export default function NotificationSettings() {
  const { account, cloudMode, openGate } = useContent()
  const [enabled, setEnabled] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  useEffect(() => { void browserPushEnabled().then(setEnabled).catch(() => {}) }, [account?.id])
  const unavailable = cloudMode ? pushAvailability() : '本机演示尚未连接云端通知服务。'
  const toggle = async () => { if (!account) { openGate(); return } setBusy(true); setMessage(''); try { if (enabled) await disableBrowserPush(); else await enableBrowserPush(); setEnabled(!enabled); setMessage(enabled ? '此浏览器的通知已关闭' : '此浏览器已订阅新作品通知') } catch(e) { setMessage(communityError(e)) } finally { setBusy(false) } }
  return <section className="community-notifications"><Bell size={24} /><div><h3>让新地图来找你</h3><p>关注分类出现新公开作品时，可在这个浏览器接收通知。未选择关注分类时，接收全部新作品；每台设备可分别关闭。</p>{unavailable && <small>{unavailable}</small>}{message && <p role="status">{message}</p>}</div><button disabled={busy || (!!unavailable && !enabled)} onClick={() => void toggle()}>{enabled ? <BellOff size={16} /> : <Bell size={16} />}{enabled ? '关闭通知' : '开启浏览器通知'}</button></section>
}
