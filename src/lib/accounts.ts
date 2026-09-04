/**
 * 账号注册中心（前端本地账号体系 + JSON 协作导出/导入）：
 * - 三个预置管理员账号（对应现有三位成员：笙茗Reves / 圣雄肝帝 / 子虚的白菜）
 * - 访客只能注册成员账号（status=pending），需管理员在「账号管理」中审核
 * - 审核通过后自动生成该成员的个人主页与作品集入口
 * 注意：账号与内容一样保存在浏览器（账号 localStorage / 内容 IndexedDB），
 * 跨设备协作请使用管理员模式里的「导出 / 导入 JSON」同步。
 */

export type AccountRole = 'admin' | 'member'
export type AccountStatus = 'approved' | 'pending' | 'rejected'

export interface AccountRecord {
  id: string
  username: string
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

const ACCOUNTS_KEY = 'ttf-accounts-v2'
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

export function loadAccounts(): AccountRecord[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (a) =>
        a &&
        typeof a.id === 'string' &&
        typeof a.username === 'string' &&
        typeof a.role === 'string' &&
        typeof a.salt === 'string' &&
        typeof a.passwordHash === 'string',
    )
  } catch {
    return []
  }
}

export function saveAccounts(accounts: AccountRecord[]): void {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
  } catch {
    // 存储不可用时账号体系降级为内存态（会提示管理员导出/清理）
  }
}

function isUsableUsername(username: string): boolean {
  return /^[a-zA-Z0-9_\-\u4e00-\u9fa5]{2,24}$/.test(username)
}

/** 首次运行：写入三个预置管理员；旧版单管理员凭据存在时迁移为兼容别名 */
export async function ensureAccountsSeeded(): Promise<AccountRecord[]> {
  const existing = loadAccounts()
  if (existing.length === 0) {
    const seeded: AccountRecord[] = []
    for (const preset of accountPresets) {
      const salt = makeSalt()
      seeded.push({
        id: preset.id,
        username: preset.username,
        displayName: preset.displayName,
        role: 'admin',
        status: 'approved',
        salt,
        passwordHash: await hashPassword(preset.defaultPassword, salt),
        memberId: preset.memberId,
        topic: preset.topic,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    }
    saveAccounts(seeded)
    return seeded
  }
  return existing
}

export function findAccountByUsername(accounts: AccountRecord[], username: string): AccountRecord | undefined {
  const u = username.trim().toLowerCase()
  return accounts.find((a) => a.username.toLowerCase() === u)
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
  if (!isUsableUsername(name)) {
    return { ok: false, error: '用户名需为 2-24 位中英文/数字/下划线/连字符' }
  }
  if (!shown) return { ok: false, error: '请填写你想展示的昵称' }
  if (password.length < 4) return { ok: false, error: '密码至少 4 位' }
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

export async function verifyAccountPassword(account: AccountRecord, password: string): Promise<boolean> {
  return (await hashPassword(password, account.salt)) === account.passwordHash
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
  const ok = await verifyAccountPassword(account, password)
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
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  }
}

export function accountListExport(accounts: AccountRecord[]): string {
  // 导出不含密码哈希，仅含账号元信息（供跨设备迁移，密码需重新设置）
  return JSON.stringify(accounts.map((a) => ({ ...a, salt: '', passwordHash: '' })), null, 2)
}
