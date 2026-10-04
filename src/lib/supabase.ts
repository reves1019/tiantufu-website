import type { SupabaseClient } from '@supabase/supabase-js'
import type { Member, WorkItem } from '../config/site'

/**
 * Supabase browser bridge. It is intentionally optional so the offline editor
 * continues to work when project environment variables are absent.
 * Only a publishable/legacy anon key belongs here; never expose service_role.
 */
const projectUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const publishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
).trim()

export const supabaseConfigured = Boolean(projectUrl && publishableKey)

let clientPromise: Promise<SupabaseClient | null> | null = null
let cloudSessionRememberChoice: boolean | null = null

// Keep Supabase's auth token in the chosen browser storage: sessionStorage for
// "remember me" off, localStorage otherwise. Reads can restore either mode.
const authStorage = {
  getItem(key: string) {
    try {
      return localStorage.getItem(key) ?? sessionStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem(key: string, value: string) {
    try {
      const remembered = cloudSessionRememberChoice ?? localStorage.getItem(key) !== null
      cloudSessionRememberChoice = null
      const selected = remembered ? localStorage : sessionStorage
      const other = remembered ? sessionStorage : localStorage
      selected.setItem(key, value)
      other.removeItem(key)
    } catch {
      // Supabase reports auth persistence failures through its own auth flow.
    }
  },
  removeItem(key: string) {
    try {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
    } catch {
      // Storage may be unavailable in private browsing.
    }
  },
}

export function setCloudRememberMe(remember: boolean) {
  cloudSessionRememberChoice = remember
}

export function getSupabaseClient(): Promise<SupabaseClient | null> {
  if (!supabaseConfigured) return Promise.resolve(null)
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(projectUrl, publishableKey, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true,
          storage: authStorage,
        },
        realtime: { params: { eventsPerSecond: 5 } },
      }),
    )
  }
  return clientPromise
}

export interface CloudProfile {
  id: string
  username: string
  display_name: string
  role: 'admin' | 'member'
  status: 'approved' | 'pending' | 'rejected'
  member_id: string | null
  bio: string
  avatar: string
  topic: string | null
  created_at: string
  updated_at: string
}

export async function signInCloudAccount(email: string, password: string, remember = true) {
  const client = await getSupabaseClient()
  if (!client) throw new Error('尚未配置 Supabase 项目')
  setCloudRememberMe(remember)
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function registerCloudMember(input: {
  email: string
  password: string
  username: string
  displayName: string
  note?: string
}) {
  const client = await getSupabaseClient()
  if (!client) throw new Error('尚未配置 Supabase 项目')
  const { data, error } = await client.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        username: input.username.trim(),
        display_name: input.displayName.trim(),
        note: input.note?.trim() ?? '',
      },
    },
  })
  if (error) throw error
  return data
}

export async function signOutCloudAccount() {
  const client = await getSupabaseClient()
  if (!client) return
  // Log out only this browser. Pending-member cleanup must not revoke an
  // administrator's separate session on another device.
  const { error } = await client.auth.signOut({ scope: 'local' })
  if (error) throw error
}

export async function getCloudSessionUser(): Promise<{ id: string; email?: string } | null> {
  const client = await getSupabaseClient()
  if (!client) return null
  const { data, error } = await client.auth.getSession()
  if (error) throw error
  return data.session?.user ? { id: data.session.user.id, email: data.session.user.email ?? undefined } : null
}

export async function subscribeCloudAuth(onAuthChange: (userId: string | null, event: string) => void): Promise<() => void> {
  const client = await getSupabaseClient()
  if (!client) return () => undefined
  const { data } = client.auth.onAuthStateChange((event, session) => onAuthChange(session?.user.id ?? null, event))
  return () => data.subscription.unsubscribe()
}

export async function changeCloudPassword(oldPassword: string, newPassword: string) {
  const client = await getSupabaseClient()
  if (!client) throw new Error('尚未配置 Supabase 项目')
  const { data: current, error: currentError } = await client.auth.getUser()
  if (currentError) throw currentError
  if (!current.user?.email) throw new Error('当前账号没有可验证的邮箱')
  const { error: verifyError } = await client.auth.signInWithPassword({ email: current.user.email, password: oldPassword })
  if (verifyError) throw new Error('旧密码不正确')
  const { error } = await client.auth.updateUser({ password: newPassword })
  if (error) throw error
}

export async function completeCloudPasswordRecovery(newPassword: string) {
  const client = await getSupabaseClient()
  if (!client) throw new Error('尚未配置 Supabase 项目')
  const { error } = await client.auth.updateUser({ password: newPassword })
  if (error) throw error
}

export async function sendCloudPasswordReset(email: string) {
  const client = await getSupabaseClient()
  if (!client) throw new Error('尚未配置 Supabase 项目')
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
  if (error) throw error
}

export async function getCloudProfile(userId?: string): Promise<CloudProfile | null> {
  const client = await getSupabaseClient()
  if (!client) return null
  let targetId = userId
  if (!targetId) {
    const { data, error: authError } = await client.auth.getUser()
    if (authError) throw authError
    targetId = data.user?.id
  }
  if (!targetId) return null
  const query = client.from('profiles').select('*').eq('id', targetId)
  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return (data as CloudProfile | null) ?? null
}

export async function listCloudProfiles(): Promise<CloudProfile[]> {
  const client = await getSupabaseClient()
  if (!client) return []
  const { data, error } = await client.from('profiles').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data as CloudProfile[] | null) ?? []
}

export async function updateMyCloudProfile(patch: Pick<CloudProfile, 'display_name' | 'bio' | 'avatar'>) {
  const client = await getSupabaseClient()
  if (!client) throw new Error('尚未配置 Supabase 项目')
  const { data: authData, error: authError } = await client.auth.getUser()
  if (authError) throw authError
  if (!authData.user) throw new Error('请先登录')
  const { error } = await client.from('profiles').update(patch).eq('id', authData.user.id)
  if (error) throw error
}

export async function setCloudMemberStatus(input: {
  userId: string
  status: 'rejected' | 'pending'
  memberId?: string | null
  topic?: string | null
}) {
  const client = await getSupabaseClient()
  if (!client) throw new Error('尚未配置 Supabase 项目')
  const { error } = await client.rpc('admin_set_member_status', {
    target_user_id: input.userId,
    next_status: input.status,
    target_member_id: input.memberId ?? null,
    target_topic: input.topic ?? null,
  })
  if (error) throw error
}

export interface CloudMemberApplication {
  id: string
  email: string
  username: string
  display_name: string
  status: 'pending' | 'approved' | 'rejected'
  member_id: string | null
  topic: string | null
  note: string
  created_at: string
}

export async function listCloudMemberApplications(): Promise<CloudMemberApplication[]> {
  const client = await getSupabaseClient()
  if (!client) return []
  const { data, error } = await client.rpc('admin_list_member_applications')
  if (error) throw error
  return (data as CloudMemberApplication[] | null) ?? []
}

export async function approveCloudMember(input: {
  userId: string
  memberId: string
  topic: string
  member: Member
  work: WorkItem
}): Promise<unknown> {
  const client = await getSupabaseClient()
  if (!client) throw new Error('尚未配置 Supabase 项目')
  const { data, error } = await client.rpc('admin_approve_member', {
    target_user_id: input.userId,
    target_member_id: input.memberId,
    target_topic: input.topic,
    next_member_card: input.member,
    next_work_entry: input.work,
  })
  if (error) throw error
  return data
}

export async function deleteCloudMemberAccount(userId: string) {
  const client = await getSupabaseClient()
  if (!client) throw new Error('尚未配置 Supabase 项目')
  const { error } = await client.rpc('admin_delete_member_account', { target_user_id: userId })
  if (error) throw error
}

export async function updateCloudMemberProfile(input: { displayName: string; bio: string; avatar: string }) {
  const client = await getSupabaseClient()
  if (!client) throw new Error('尚未配置 Supabase 项目')
  const { error } = await client.rpc('update_my_member_profile', {
    next_display_name: input.displayName,
    next_bio: input.bio,
    next_avatar: input.avatar,
  })
  if (error) throw error
}

export interface SharedContentSnapshot<T = unknown> {
  content: T
  updatedAt: string
}

export class CloudContentConflictError extends Error {
  constructor() {
    super('云端已有更新，本机草稿已保留。请备份草稿后加载最新云端内容再合并修改。')
    this.name = 'CloudContentConflictError'
  }
}

export async function loadSharedContentSnapshot<T>(): Promise<SharedContentSnapshot<T> | null> {
  const client = await getSupabaseClient()
  if (!client) return null
  const { data, error } = await client.from('site_content').select('content, updated_at').eq('id', 'main').maybeSingle()
  if (error) throw error
  return data ? { content: data.content as T, updatedAt: data.updated_at as string } : null
}

export async function loadSharedContent<T>(): Promise<T | null> {
  return (await loadSharedContentSnapshot<T>())?.content ?? null
}

/** First-time migration is explicit and atomic: never overwrite existing cloud content. */
export async function initializeSharedContent(content: unknown): Promise<void> {
  const client = await getSupabaseClient()
  if (!client) throw new Error('尚未配置 Supabase 项目')
  const { error } = await client.rpc('admin_initialize_site_content', { initial_site_content: content })
  if (error) throw error
}

export async function saveSharedContent(content: unknown, expectedUpdatedAt: string): Promise<SharedContentSnapshot> {
  const client = await getSupabaseClient()
  if (!client) throw new Error('尚未配置 Supabase 项目')
  if (!expectedUpdatedAt) throw new Error('尚未读取云端版本，不能提交整站内容')
  // Compare-and-set happens in the database, not in a preceding browser read.
  // Member profile/approval transactions also advance updated_at.
  const { data, error } = await client.from('site_content').update({ content })
    .eq('id', 'main').eq('updated_at', expectedUpdatedAt).select('content, updated_at').maybeSingle()
  if (error) throw error
  if (!data) throw new CloudContentConflictError()
  return { content: data.content, updatedAt: data.updated_at as string }
}

export async function subscribeSharedContent(
  onContent: (content: unknown, updatedAt: string) => void,
  onStatus?: (status: string) => void,
): Promise<() => void> {
  const client = await getSupabaseClient()
  if (!client) return () => undefined
  const channel = client
    .channel('tiantufu-site-content')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'site_content', filter: 'id=eq.main' }, (payload) => {
      const next = payload.new as { content?: unknown; updated_at?: string } | null
      if (next?.content !== undefined && next.updated_at) onContent(next.content, next.updated_at)
    })
    .subscribe((status) => onStatus?.(status))
  return () => {
    void client.removeChannel(channel)
  }
}

/** Profile changes refresh the signed-in user's access and the admin review list. */
export async function subscribeCloudProfiles(onChange: () => void): Promise<() => void> {
  const client = await getSupabaseClient()
  if (!client) return () => undefined
  const channel = client
    .channel('tiantufu-profiles')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, onChange)
    .subscribe()
  return () => {
    void client.removeChannel(channel)
  }
}

export async function uploadCloudImage(file: File, path: string): Promise<string> {
  const client = await getSupabaseClient()
  if (!client) throw new Error('尚未配置 Supabase 项目')
  const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])
  if (!allowedTypes.has(file.type)) throw new Error('仅支持 JPEG、PNG、WebP、GIF 或 AVIF 图片')
  if (file.size > 10 * 1024 * 1024) throw new Error('图片不能超过 10 MiB')
  const { data, error } = await client.storage.from('tiantufu-media').upload(path, file, {
    cacheControl: '31536000',
    contentType: file.type,
    upsert: true,
  })
  if (error) throw error
  return client.storage.from('tiantufu-media').getPublicUrl(data.path).data.publicUrl
}

export async function getCloudUserId(): Promise<string> {
  const client = await getSupabaseClient()
  if (!client) throw new Error('尚未配置 Supabase 项目')
  const { data, error } = await client.auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('请先登录后上传图片')
  return data.user.id
}
