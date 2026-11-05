import { getSupabaseClient, setCloudRememberMe, getCloudProfile } from './supabase'

export function normalizeRegistrationEmail(email: string) {
  const normalized = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || normalized.length > 254) throw new Error('请填写有效的邮箱地址')
  return normalized
}
export async function activateEmailMember() {
  const client = await getSupabaseClient()
  if (!client) return false
  const { data, error } = await client.rpc('activate_email_member')
  if (error) throw error
  return data === true
}
export async function confirmRegistrationEmail(email: string, token: string) {
  if (!/^\d{6,8}$/.test(token.trim())) throw new Error('请输入邮件中的验证码')
  const client = await getSupabaseClient()
  if (!client) throw new Error('邮箱验证尚未连接')
  setCloudRememberMe(false)
  const { data, error } = await client.auth.verifyOtp({ email: normalizeRegistrationEmail(email), token: token.trim(), type: 'email' })
  if (error) throw new Error('验证码无效或已过期，请重试或重新发送')
  try {
    if (!(await activateEmailMember())) throw new Error('账号暂不可用，请联系管理员')
    if (!data.user || (await getCloudProfile(data.user.id))?.status !== 'approved') throw new Error('账号暂不可用，请联系管理员')
  } catch (error) { await client.auth.signOut({ scope: 'local' }); throw error }
}
export async function resendRegistrationEmail(email: string) {
  const client = await getSupabaseClient()
  if (!client) throw new Error('邮箱验证尚未连接')
  const { error } = await client.auth.resend({ type: 'signup', email: normalizeRegistrationEmail(email), options: { emailRedirectTo: `${location.origin}${location.pathname}` } })
  if (error) throw error
}
