import { adminConfig } from '../config/site'

/** 凭据存储键（新体系） */
const CRED_KEY = 'ttf-admin-credentials'
const SESSION_KEY = 'ttf-admin-session'
/** 旧体系兼容键（仅迁移/读取） */
const LEGACY_PASS_KEY = 'ttf-admin-passcode'
const LEGACY_AUTH_KEY = 'ttf-admin-authed'
const FAIL_KEY = 'ttf-admin-fails'
const LOCK_KEY = 'ttf-admin-lock-until'

const FAIL_LIMIT = 5
const LOCK_MS = 30000

interface Credentials {
  username: string
  salt: string
  passwordHash: string
}

function bufToHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** SHA-256（加盐哈希）；非安全上下文时回退为演示用 FNV 双哈希，保证登录不中断 */
async function sha256(text: string): Promise<string> {
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

function readCredentials(): Credentials | null {
  try {
    const raw = localStorage.getItem(CRED_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Credentials
    if (typeof parsed.username === 'string' && typeof parsed.salt === 'string' && typeof parsed.passwordHash === 'string') {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

async function writeCredentials(username: string, password: string) {
  const salt = `${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
  const passwordHash = await sha256(`${salt}:${password}`)
  localStorage.setItem(CRED_KEY, JSON.stringify({ username, salt, passwordHash }))
}

/** 兼容迁移：旧 `ttf-admin-passcode` 存在时，以默认用户名把旧密码哈希为新凭据，并删除旧键 */
export async function ensureAuthInitialized(): Promise<void> {
  if (readCredentials()) return
  const legacy = localStorage.getItem(LEGACY_PASS_KEY)
  const password = legacy && legacy !== adminConfig.passcode ? legacy : adminConfig.passcode
  await writeCredentials(adminConfig.username, password)
  if (legacy !== null) localStorage.removeItem(LEGACY_PASS_KEY)
}

export async function verifyLogin(username: string, password: string): Promise<boolean> {
  await ensureAuthInitialized()
  const cred = readCredentials()
  if (!cred || cred.username !== username.trim()) return false
  const hash = await sha256(`${cred.salt}:${password}`)
  return hash === cred.passwordHash
}

export function getLockRemaining(): number {
  try {
    const until = Number(sessionStorage.getItem(LOCK_KEY) || 0)
    return Math.max(0, until - Date.now())
  } catch {
    return 0
  }
}

export function registerFailure(): { locked: boolean; remaining: number } {
  try {
    const fails = Number(sessionStorage.getItem(FAIL_KEY) || 0) + 1
    if (fails >= FAIL_LIMIT) {
      sessionStorage.setItem(LOCK_KEY, String(Date.now() + LOCK_MS))
      sessionStorage.setItem(FAIL_KEY, '0')
      return { locked: true, remaining: LOCK_MS }
    }
    sessionStorage.setItem(FAIL_KEY, String(fails))
    return { locked: false, remaining: 0 }
  } catch {
    return { locked: false, remaining: 0 }
  }
}

function clearFailures() {
  try {
    sessionStorage.removeItem(FAIL_KEY)
    sessionStorage.removeItem(LOCK_KEY)
  } catch {
    // 忽略
  }
}

/** 登录：成功时写入会话标记（记住我 → localStorage，否则 sessionStorage） */
export async function login(username: string, password: string, remember: boolean): Promise<boolean> {
  if (getLockRemaining() > 0) return false
  const ok = await verifyLogin(username, password)
  if (!ok) {
    registerFailure()
    return false
  }
  clearFailures()
  try {
    if (remember) {
      localStorage.setItem(SESSION_KEY, '1')
      sessionStorage.removeItem(SESSION_KEY)
    } else {
      sessionStorage.setItem(SESSION_KEY, '1')
      localStorage.removeItem(SESSION_KEY)
    }
    sessionStorage.setItem(LEGACY_AUTH_KEY, '1')
  } catch {
    // 忽略
  }
  return true
}

export function isAuthed(): boolean {
  try {
    return (
      localStorage.getItem(SESSION_KEY) === '1' ||
      sessionStorage.getItem(SESSION_KEY) === '1' ||
      sessionStorage.getItem(LEGACY_AUTH_KEY) === '1'
    )
  } catch {
    return false
  }
}

export function logout() {
  try {
    localStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(LEGACY_AUTH_KEY)
  } catch {
    // 忽略
  }
  clearFailures()
}

export async function changeCredentials(
  currentUsername: string,
  currentPassword: string,
  newUsername: string,
  newPassword: string,
): Promise<{ ok: boolean; error?: string }> {
  await ensureAuthInitialized()
  const ok = await verifyLogin(currentUsername, currentPassword)
  if (!ok) return { ok: false, error: '旧用户名或密码不正确' }
  const username = newUsername.trim()
  if (!username) return { ok: false, error: '新用户名不能为空' }
  if (newPassword.trim().length < 4) return { ok: false, error: '新密码至少 4 位' }
  await writeCredentials(username, newPassword)
  return { ok: true }
}
