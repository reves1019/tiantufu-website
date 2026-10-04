/**
 * 账号注册中心（前端本地账号体系 + JSON 协作导出/导入）：
 * - 三个预置管理员账号（对应现有三位成员：笙茗Reves / 圣雄肝帝 / 子虚的白菜）
 * - 访客只能注册成员账号（status=pending），需管理员在「账号管理」中审核
 * - 审核通过后自动生成该成员的个人主页与作品集入口
 * 注意：该站点目前是静态前端，账号只保存在当前浏览器；同浏览器标签页可实时同步，
 * 跨设备协作仍需导出/导入，真正的公网实时同步需要配置服务端存储与鉴权。
 */

export type AccountRole = 'admin' | 'member'
export type AccountStatus = 'approved' | 'pending' | 'rejected'

export interface AccountLoginAlias {
  username: string
  salt: string
  passwordHash: string
}

export interface AccountRecord {
  id: string
  username: string
  /** Supabase 邮箱身份；离线本地账号不需要邮箱字段 */
  email?: string
  displayName: string
  role: AccountRole
  status: AccountStatus
  salt: string
  passwordHash: string
  /** 关联内容 members 中的成员卡 id（管理员审核通过时建立） */
  memberId?: string
  /** 申请人/成员自我介绍（占位，可由本人编辑） */
  bio?: string
  /** 申请备注 */
  note?: string
  /** 创作主题偏好（管理员审核时可调整） */
  topic?: string
  /** 个人公开头像；与成员主页的头像保持同步 */
  avatar?: string
  /** 旧版管理员登录名迁移为预设管理员的别名，不增加管理员账号数量 */
  loginAliases?: AccountLoginAlias[]
  createdAt: number
  updatedAt: number
}

export interface AccountPreset {
  id: string
  username: string
  displayName: string
  memberId: string
  topic: string
  defaultPassword: string
}

export const ACCOUNTS_STORAGE_KEY = 'ttf-accounts-v2'
const SESSION_KEY = 'ttf-session-v2'
const REMEMBER_KEY = 'ttf-session-remember-v2'

/** 三个预置管理员：账号名 / 默认密码 / 对应的成员主页 */
export const accountPresets: AccountPreset[] = [
  {
    id: 'admin-reves',
    username: 'reves',
    displayName: '笙茗Reves',
    memberId: 'shengming-reves',
    topic: 'zhengshi',
    defaultPassword: 'ttf-2026-reves',
  },
  {
    id: 'admin-shengxiong',
    username: 'shengxiong',
    displayName: '圣雄肝帝',
    memberId: 'shengxiong-gandi',
    topic: 'ban-jiakong',
    defaultPassword: 'ttf-2026-shengxiong',
  },
  {
    id: 'admin-baicai',
    username: 'baicai',
    displayName: '子虚的白菜',
    memberId: 'zixu-debaicai',
    topic: 'quan-jiakong',
    defaultPassword: 'ttf-2026-baicai',
  },
]

function bufToHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** SHA-256（加盐）；非安全上下文回退 FNV 双哈希，保证离线 file:// 也能登录 */
export async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  if (globalThis.crypto?.subtle) {
    return bufToHex(await crypto.subtle.digest('SHA-256', data))
  }
  let h1 = 0x811c9dc5
  let h2 = 0x01000193
  for (const byte of data) {
    h1 = ((h1 ^ byte) * 0x01000193) >>> 0
    h2 = ((h2 ^ byte) * 0x01000193) >>> 0
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')
}

async function hashPassword(password: string, salt: string): Promise<string> {
  return sha256(`${salt}:${password}`)
}

function makeSalt(): string {
  return `${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

export function uid(prefix = 'acct'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function parseAccounts(raw: string | null): AccountRecord[] {
  try {
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (a) =>
        a &&
        typeof a.id === 'string' &&
        typeof a.username === 'string' &&
        (a.role === 'admin' || a.role === 'member') &&
        (a.status === 'approved' || a.status === 'pending' || a.status === 'rejected') &&
        typeof a.salt === 'string' &&
        typeof a.passwordHash === 'string',
    ).map((a) => ({
      ...a,
      loginAliases: Array.isArray(a.loginAliases)
        ? a.loginAliases.filter(
            (alias: unknown) =>
              !!alias &&
              typeof alias === 'object' &&
              typeof (alias as AccountLoginAlias).username === 'string' &&
              typeof (alias as AccountLoginAlias).salt === 'string' &&
              typeof (alias as AccountLoginAlias).passwordHash === 'string',
          )
        : [],
    }))
  } catch {
    return []
  }
}

export function loadAccounts(): AccountRecord[] {
  try {
    return parseAccounts(localStorage.getItem(ACCOUNTS_STORAGE_KEY))
  } catch {
    return []
  }
}

/** 返回真实写入结果，避免静默忽略浏览器存储不可用或空间不足。 */
export function saveAccounts(accounts: AccountRecord[]): boolean {
  try {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts))
    return true
  } catch {
    return false
  }
}

function isUsableUsername(username: string): boolean {
  return /^[a-zA-Z0-9_\-\u4e00-\u9fa5]{2,24}$/.test(username)
}

/** Shared client-side validation for local and cloud member applications. */
export function validateMemberRegistration(
  username: string,
  displayName: string,
  password: string,
  minimumPasswordLength = 4,
): string | null {
  if (!isUsableUsername(username.trim())) {
    return '用户名需为 2-24 位中英文/数字/下划线/连字符'
  }
  if (!displayName.trim()) return '请填写你想展示的昵称'
  if (displayName.trim().length > 48) return '展示昵称不能超过 48 个字符'
  if (password.length < minimumPasswordLength) return `密码至少 ${minimumPasswordLength} 位`
  return null
}

async function createPresetAccount(preset: AccountPreset): Promise<AccountRecord> {
  const salt = makeSalt()
  const now = Date.now()
  return {
    id: preset.id,
    username: preset.username,
    displayName: preset.displayName,
    role: 'admin',
    status: 'approved',
    salt,
    passwordHash: await hashPassword(preset.defaultPassword, salt),
    memberId: preset.memberId,
    topic: preset.topic,
    createdAt: now,
    updatedAt: now,
  }
}

/** 确保始终只有三条预设管理员记录；历史多出的管理员不再保留全站编辑权限。 */
export async function reconcilePresetAdmins(records: AccountRecord[]): Promise<AccountRecord[]> {
  const working = [...records]
  const admins: AccountRecord[] = []

  for (const preset of accountPresets) {
    let index = working.findIndex((account) => account.id === preset.id)
    if (index < 0) {
      index = working.findIndex((account) => account.username.toLowerCase() === preset.username.toLowerCase())
    }

    const existing = index >= 0 ? working.splice(index, 1)[0] : null
    if (existing) {
      admins.push({
        ...existing,
        role: 'admin',
        status: 'approved',
        memberId: existing.memberId || preset.memberId,
        topic: existing.topic || preset.topic,
      })
    } else {
      admins.push(await createPresetAccount(preset))
    }
  }

  const availableNames = new Set(
    [...admins, ...working.filter((account) => account.role !== 'admin')]
      .flatMap((account) => [account.username, ...(account.loginAliases ?? []).map((alias) => alias.username)])
      .map((username) => username.toLowerCase()),
  )
  const legacyAliases: AccountLoginAlias[] = []
  const migratedAdminIds = new Set<string>()
  for (const account of working) {
    if (account.role !== 'admin' || availableNames.has(account.username.toLowerCase())) continue
    legacyAliases.push({ username: account.username, salt: account.salt, passwordHash: account.passwordHash })
    availableNames.add(account.username.toLowerCase())
    migratedAdminIds.add(account.id)
  }
  const remaining = working.map((account) => {
    if (account.role !== 'admin') return account
    if (migratedAdminIds.has(account.id)) return null
    return {
      ...account,
      role: 'member' as const,
      status: 'pending' as const,
      memberId: undefined,
      note: account.note || '旧管理员账号已迁移为成员申请，请管理员重新审核。',
      updatedAt: Date.now(),
    }
  }).filter((account): account is AccountRecord => account !== null)

  if (legacyAliases.length > 0) {
    admins[0] = { ...admins[0], loginAliases: [...(admins[0].loginAliases ?? []), ...legacyAliases] }
  }
  return [...remaining, ...admins]
}

/** 首次运行或升级：补齐三个预设管理员，并收敛历史遗留权限。 */
export async function ensureAccountsSeeded(): Promise<AccountRecord[]> {
  const reconciled = await reconcilePresetAdmins(loadAccounts())
  saveAccounts(reconciled)
  return reconciled
}

export function findAccountByUsername(accounts: AccountRecord[], username: string): AccountRecord | undefined {
  const u = username.trim().toLowerCase()
  return accounts.find(
    (a) =>
      a.username.toLowerCase() === u ||
      (Array.isArray(a.loginAliases) && a.loginAliases.some((alias) => alias.username.toLowerCase() === u)),
  )
}

export function findAccountById(accounts: AccountRecord[], id: string): AccountRecord | undefined {
  return accounts.find((a) => a.id === id)
}

export interface RegisterResult {
  ok: boolean
  error?: string
  account?: AccountRecord
}

/** 注册成员账号：用户名唯一性校验；提交后状态为 pending，等待管理员审核 */
export async function registerMemberAccount(
  accounts: AccountRecord[],
  username: string,
  displayName: string,
  password: string,
  note?: string,
): Promise<RegisterResult> {
  const name = username.trim()
  const shown = displayName.trim()
  const validationError = validateMemberRegistration(name, shown, password)
  if (validationError) return { ok: false, error: validationError }
  if (findAccountByUsername(accounts, name)) return { ok: false, error: '该用户名已被占用' }
  const salt = makeSalt()
  const account: AccountRecord = {
    id: uid(),
    username: name,
    displayName: shown,
    role: 'member',
    status: 'pending',
    salt,
    passwordHash: await hashPassword(password, salt),
    bio: '',
    note: note?.trim() || '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  return { ok: true, account }
}

export interface AuthResult {
  ok: boolean
  account?: AccountRecord
  error?: 'bad' | 'pending' | 'rejected' | 'lock'
}

export async function verifyAccountPassword(account: AccountRecord, password: string, username?: string): Promise<boolean> {
  const alias = username
    ? account.loginAliases?.find((item) => item.username.toLowerCase() === username.trim().toLowerCase())
    : undefined
  const salt = alias?.salt ?? account.salt
  const expected = alias?.passwordHash ?? account.passwordHash
  return expected !== '' && (await hashPassword(password, salt)) === expected
}

/** 登录：管理员与已审核成员均可登录；未审核成员给出明确提示 */
export async function authenticateAccount(
  accounts: AccountRecord[],
  username: string,
  password: string,
  remember: boolean,
): Promise<AuthResult> {
  const account = findAccountByUsername(accounts, username)
  if (!account) return { ok: false, error: 'bad' }
  if (account.status === 'pending') return { ok: false, error: 'pending' }
  if (account.status === 'rejected') return { ok: false, error: 'rejected' }
  const ok = await verifyAccountPassword(account, password, username)
  if (!ok) return { ok: false, error: 'bad' }
  try {
    if (remember) {
      localStorage.setItem(SESSION_KEY, account.id)
      localStorage.setItem(REMEMBER_KEY, '1')
      sessionStorage.removeItem(SESSION_KEY)
    } else {
      sessionStorage.setItem(SESSION_KEY, account.id)
      localStorage.removeItem(REMEMBER_KEY)
    }
  } catch {
    // 忽略存储异常
  }
  return { ok: true, account }
}

export function currentAccountId(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(REMEMBER_KEY)
  } catch {
    // 忽略
  }
}

export function isRememberedSession(): boolean {
  try {
    return localStorage.getItem(REMEMBER_KEY) === '1'
  } catch {
    return false
  }
}

export function publicAccountView(account: AccountRecord) {
  return {
    id: account.id,
    username: account.username,
    displayName: account.displayName,
    role: account.role,
    status: account.status,
    memberId: account.memberId,
    topic: account.topic,
    bio: account.bio,
    note: account.note,
    avatar: account.avatar,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  }
}

export function filterEditableProfilePatch(
  role: AccountRole,
  patch: Partial<Pick<AccountRecord, 'displayName' | 'bio' | 'topic' | 'avatar'>>,
): Partial<Pick<AccountRecord, 'displayName' | 'bio' | 'topic' | 'avatar'>> {
  if (role === 'admin') return patch
  return { displayName: patch.displayName, bio: patch.bio, avatar: patch.avatar }
}

export function exportMemberAccountMetadata(accounts: AccountRecord[]): string {
  // 只导出成员账号元数据；预设管理员及管理员登录别名不会离开本机。
  return JSON.stringify(
    accounts.filter((account) => account.role === 'member').map((account) => ({
      ...account,
      salt: '',
      passwordHash: '',
      loginAliases: [],
    })),
    null,
    2,
  )
}

export function accountListExport(accounts: AccountRecord[]): string {
  return exportMemberAccountMetadata(accounts)
}

export interface AccountImportPlan {
  ok: boolean
  error?: string
  accounts?: AccountRecord[]
  importedCount?: number
}

/** 安全合并账号协作 JSON：仅允许成员条目，且空凭据不能覆盖本地已有密码。 */
export function mergeMemberAccountMetadata(
  current: AccountRecord[],
  json: string,
  availableMemberIds: ReadonlySet<string> = new Set(),
): AccountImportPlan {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { ok: false, error: 'JSON 解析失败' }
  }
  if (!Array.isArray(parsed)) return { ok: false, error: '账号 JSON 必须是数组' }

  const next = [...current]
  const seenNames = new Set<string>()
  const presetNames = new Set(accountPresets.map((preset) => preset.username.toLowerCase()))
  let importedCount = 0

  for (const row of parsed) {
    if (!row || typeof row !== 'object' || typeof row.id !== 'string' || typeof row.username !== 'string') continue
    // 兼容旧版全量导出，但绝不允许导入文件创建或覆盖管理员。
    if (row.role === 'admin') continue
    const username = row.username.trim()
    if (!username) continue
    const normalizedName = username.toLowerCase()
    if (seenNames.has(normalizedName)) continue
    seenNames.add(normalizedName)

    const byId = findAccountById(next, row.id)
    const byName = findAccountByUsername(next, username)
    if (presetNames.has(normalizedName) || byId?.role === 'admin' || byName?.role === 'admin') {
      return { ok: false, error: `「${username}」与预设管理员冲突；本机管理员账号未作更改` }
    }
    if (byId && byName && byId.id !== byName.id) {
      return { ok: false, error: `「${username}」与本机另一个成员账号冲突；未导入任何更改` }
    }
    const existing = byId ?? byName
    if (existing && existing.role !== 'member') continue

    const importedMemberId = typeof row.memberId === 'string' ? row.memberId : undefined
    const profileExists = !!importedMemberId && availableMemberIds.has(importedMemberId)
    const status: AccountStatus =
      row.status === 'rejected'
        ? 'rejected'
        : row.status === 'approved' && profileExists
          ? 'approved'
          : 'pending'
    const incoming: AccountRecord = {
      id: existing?.id ?? row.id,
      username,
      displayName: typeof row.displayName === 'string' && row.displayName.trim() ? row.displayName.trim() : username,
      role: 'member',
      status,
      salt: existing?.salt || '',
      passwordHash: existing?.passwordHash || '',
      memberId: status === 'approved' ? importedMemberId : undefined,
      bio: typeof row.bio === 'string' ? row.bio : existing?.bio ?? '',
      note: typeof row.note === 'string' ? row.note : existing?.note ?? '',
      topic: typeof row.topic === 'string' ? row.topic : existing?.topic,
      avatar: typeof row.avatar === 'string' ? row.avatar : existing?.avatar,
      createdAt: typeof row.createdAt === 'number' ? row.createdAt : existing?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    }
    const index = next.findIndex((account) => account.id === incoming.id)
    if (index >= 0) next[index] = incoming
    else next.push(incoming)
    importedCount += 1
  }

  if (importedCount === 0) {
    return { ok: false, error: '文件中没有可导入的成员账号；管理员账号已被安全跳过' }
  }
  return { ok: true, accounts: next, importedCount }
}
