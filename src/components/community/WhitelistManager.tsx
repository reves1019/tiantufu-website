import { useCallback, useEffect, useState } from 'react'
import { useContent } from '../../lib/contentStore'
import { communityError, getQQApplications, getWhitelist, releaseQQ, setWhitelist, verifyQQ, type QQApplication, type WhitelistEntry } from '../../lib/community'
export default function WhitelistManager() {
  const { account, accounts, admin, cloudMode } = useContent()
  const [list, setList] = useState<WhitelistEntry[]>([]), [applications, setApplications] = useState<QQApplication[]>([])
  const [qq, setQQ] = useState(''), [label, setLabel] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false)
  const refresh = useCallback(async () => { const [a,b] = await Promise.all([getWhitelist(account), getQQApplications(account, accounts)]); setList(a); setApplications(b) }, [account, accounts])
  useEffect(() => { if (admin) void refresh().catch(e => setMessage(communityError(e))) }, [refresh, admin])
  const run = async (action: () => Promise<void>) => { if (busy) return; setBusy(true); setMessage(''); try { await action(); await refresh(); setMessage('已保存') } catch (e) { setMessage(communityError(e)) } finally { setBusy(false) } }
  if (!admin) return <p>此页面仅管理员可见。</p>
  return <div className="community-whitelist">
    <div className="community-section-head"><div><span className="community-eyebrow">MEMBERSHIP / PRIVATE</span><h2>府员 QQ 白名单</h2></div><button disabled={busy} onClick={() => void run(refresh)}>刷新申请</button></div>
    <p className="community-muted">QQ 号只对管理员和本人可见。先审核账号，再通过 QQ 等既有渠道核实身份并绑定；同一个 QQ 只能绑定一个账号。停用名单会收回编辑和上传权限。</p>
    {!cloudMode && <p className="community-status">本机演示：名单和申请暂不跨设备同步。</p>}
    <form className="community-whitelist-form" onSubmit={e => { e.preventDefault(); void run(async () => { await setWhitelist(account, qq, label); setQQ(''); setLabel('') }) }}>
      <label>府员 QQ<input required inputMode="numeric" pattern="[1-9][0-9]{4,11}" value={qq} onChange={e => setQQ(e.target.value)} placeholder="5–12 位 QQ 号" /></label>
      <label>内部备注<input value={label} maxLength={100} onChange={e => setLabel(e.target.value)} placeholder="便于管理员辨认" /></label><button className="community-primary" disabled={busy}>加入白名单</button>
    </form>
    {message && <p role="status" className="community-status">{message}</p>}
    <div className="community-table-wrap"><table><thead><tr><th>QQ 号</th><th>备注</th><th>状态</th><th>管理</th></tr></thead><tbody>{list.map(w => <tr key={w.qq_number}><td>{w.qq_number}</td><td>{w.label || '—'}</td><td>{!w.active ? '已停用' : w.claimed_by ? '已绑定府员' : '等待身份确认'}</td><td><button disabled={busy} onClick={() => void run(() => setWhitelist(account, w.qq_number, w.label, !w.active))}>{w.active ? '停用权限' : '恢复名单'}</button>{w.claimed_by && <button disabled={busy} onClick={() => { if(window.confirm('解除 QQ 与账号的绑定并停用名单？原账号和图片会保留。')) void run(() => releaseQQ(account, w.qq_number)) }}>解除绑定并停用</button>}</td></tr>)}</tbody></table>{!list.length && <p className="community-empty">名单为空，请添加真实府员 QQ 号。</p>}</div>
    <h3 className="community-subheading">申请与身份确认</h3><div className="community-application-list">{applications.map(a => <article key={a.user_id}><div><strong>{a.display_name}</strong><small>@{a.username} · QQ {a.qq_number ?? '未填写'}</small><p>{a.status === 'pending' ? '账号待审核' : a.status === 'rejected' ? '账号未通过' : a.verified ? '府员权限已开启' : a.matched ? '命中白名单，等待核实身份' : '普通注册用户：可评论、点赞、收藏'}</p></div>
      {a.status === 'pending' ? <button onClick={() => window.dispatchEvent(new CustomEvent('ttf-accounts-manager-open'))}>去审核账号</button> : <button disabled={busy || !a.matched || a.verified || a.status !== 'approved'} onClick={() => { if (window.confirm(`已通过 QQ 等既有渠道核实“${a.display_name}”拥有 QQ ${a.qq_number}？确认后将开放个人编辑和上传权限。`)) void run(() => verifyQQ(account, a)) }}>确认身份并授权</button>}</article>)}{!applications.length && <p className="community-empty">暂时没有成员申请。</p>}</div>
  </div>
}
