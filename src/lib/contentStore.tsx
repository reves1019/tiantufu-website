import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  aboutContent as defaultAbout,
  contestContent as defaultContest,
  introContent as defaultIntro,
  joinContent as defaultJoin,
  commissionContent as defaultCommission,
  faqContent as defaultFaq,
  legalContent as defaultLegal,
  topics as defaultTopics,
  directoryContent as defaultDirectory,
  earthContent as defaultEarth,
  members as defaultMembers,
  works as defaultWorkArchive,
  worksCategories as defaultWorksCategories,
  site as defaultSite,
  worksContent as defaultWorks,
  type Member,
  type WorkItem,
} from '../config/site'
import {
  type AccountRecord,
  accountPresets,
  authenticateAccount,
  clearSession,
  currentAccountId,
  ensureAccountsSeeded,
  findAccountById,
  findAccountByUsername,
  loadAccounts,
  registerMemberAccount,
  saveAccounts,
  uid,
  verifyAccountPassword,
  sha256,
} from './accounts'
import { CONTENT_KEY, idbGet, idbSet, idbSupported } from './idbStore'

export interface SiteContent {
  site: typeof defaultSite
  about: typeof defaultAbout
  directory: typeof defaultDirectory
  earth: typeof defaultEarth
  works: typeof defaultWorks
  contest: typeof defaultContest
  intro: typeof defaultIntro
  topics: typeof defaultTopics
  join: typeof defaultJoin
  commission: typeof defaultCommission
  faq: typeof defaultFaq
  legal: typeof defaultLegal
  members: Member[]
  worksArchive: WorkItem[]
  worksCategories: string[]
}

// v4：内容主存储迁移至 IndexedDB（可容纳含 Base64 大图的内容），localStorage 仅保留小体积镜像。
const CACHE_KEY = 'ttf-content-cache-v4'
const LEGACY_KEY = 'ttf-admin-content-v3'
const MIRROR_LIMIT = 1_200_000 // localStorage 镜像上限（约 1.2MB）
const SAVE_DEBOUNCE_MS = 300

export const defaultContent: SiteContent = {
  site: defaultSite,
  about: defaultAbout,
  directory: defaultDirectory,
  earth: defaultEarth,
  works: defaultWorks,
  contest: defaultContest,
  intro: defaultIntro,
  topics: defaultTopics,
  join: defaultJoin,
  commission: defaultCommission,
  faq: defaultFaq,
  legal: defaultLegal,
  members: defaultMembers,
  worksArchive: defaultWorkArchive,
  worksCategories: defaultWorksCategories,
}

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

/** 递归合并：对象按键合并，数组整体替换（管理端保存的覆盖数据） */
function deepMerge<T>(base: T, patch: unknown): T {
  if (patch === undefined || patch === null) return base
  if (Array.isArray(base)) return (Array.isArray(patch) ? patch : base) as T
  if (typeof base === 'object' && base !== null && typeof patch === 'object' && patch !== null) {
    const out: Record<string, unknown> = { ...(base as Record<string, unknown>) }
    for (const key of Object.keys(patch as Record<string, unknown>)) {
      const baseValue = (base as Record<string, unknown>)[key]
      const patchValue = (patch as Record<string, unknown>)[key]
      out[key] =
        baseValue !== undefined &&
        typeof baseValue === 'object' &&
        baseValue !== null &&
        typeof patchValue === 'object' &&
        patchValue !== null
          ? deepMerge(baseValue, patchValue)
          : patchValue
    }
    return out as T
  }
  return patch as T
}

function parseContent(json: string | null): SiteContent | null {
  if (!json) return null
  try {
    return deepMerge(defaultContent, JSON.parse(json) as unknown)
  } catch {
    return null
  }
}

/** 首次渲染用的同步初值：优先 v4 镜像，其次 v3 旧数据（迁移），否则默认 */
function syncInitialContent(): SiteContent {
  try {
    const v4 = localStorage.getItem(CACHE_KEY)
    const parsedV4 = parseContent(v4)
    if (parsedV4) return parsedV4
    const legacy = localStorage.getItem(LEGACY_KEY)
    const parsedLegacy = parseContent(legacy)
    if (parsedLegacy) return parsedLegacy
  } catch {
    // 忽略，回退默认
  }
  return clone(defaultContent)
}

function setByPath(target: Record<string | number, unknown>, path: string, value: unknown) {
  const parts = path.split('.')
  const last = parts.pop() as string
  let node: Record<string | number, unknown> = target
  for (const part of parts) {
    const key = /^\d+$/.test(part) ? Number(part) : part
    const next = node[key]
    if (typeof next !== 'object' || next === null) node[key] = {}
    node = node[key] as Record<string | number, unknown>
  }
  node[/^\d+$/.test(last) ? Number(last) : last] = value
}

/** 生成“默认占位图”：沿用现有成员素材，避免引用未打包资源 */
function fallbackAvatar(): string {
  return defaultMembers[0]?.avatar ?? ''
}
function fallbackWorkImage(): string {
  return defaultMembers[0]?.work.image ?? ''
}

/** 账号审核通过时创建的成员主页/作品集卡片 */
function makeMemberCard(account: AccountRecord, topic: string): Member {
  const name = account.displayName.trim() || account.username
  return {
    id: `member-${account.id}`,
    name,
    role: '制图师 · 社团成员（待完善）',
    topic,
    avatar: fallbackAvatar(),
    bio: account.bio?.trim() || '成员个人简介占位：欢迎来到我的主页，介绍待完善。',
    tags: ['成员'],
    work: {
      title: '我的代表作（占位）',
      image: fallbackWorkImage(),
      desc: '作品说明占位：审核通过后由本人或管理员完善。',
    },
    works: [],
  }
}

interface ContentContextValue {
  content: SiteContent
  /** 当前是否处于“全站管理员编辑”模式 */
  admin: boolean
  gateOpen: boolean
  hydrated: boolean
  saveState: SaveState
  lastSavedAt: number | null
  /** 账号注册表 */
  accounts: AccountRecord[]
  /** 当前登录账号 */
  account: AccountRecord | null
  setAdmin: (on: boolean) => void
  openGate: () => void
  closeGate: () => void
  setAt: (path: string, value: unknown) => void
  updateList: (path: string, items: unknown[]) => void
  exportJson: () => string
  importJson: (json: string) => boolean
  saveError: boolean
  clearSaveError: () => void
  reset: () => void
  /* 账号能力 */
  loginAccount: (
    username: string,
    password: string,
    remember: boolean,
  ) => Promise<{ ok: boolean; error?: string; isAdmin?: boolean; account?: AccountRecord | null }>
  registerAccount: (
    username: string,
    displayName: string,
    password: string,
    note?: string,
  ) => Promise<{ ok: boolean; error?: string }>
  logoutAccount: () => void
  approveAccount: (accountId: string, topic?: string) => { ok: boolean; error?: string }
  rejectAccount: (accountId: string) => void
  deleteAccount: (accountId: string) => void
  accountUpdateMeta: (patch: Partial<Pick<AccountRecord, 'displayName' | 'bio' | 'topic'>>) => {
    ok: boolean
    error?: string
  }
  changeMyPassword: (oldPassword: string, newPassword: string) => Promise<{ ok: boolean; error?: string }>
  adminResetPassword: (accountId: string, newPassword: string) => Promise<{ ok: boolean; error?: string }>
  accountExport: () => string
  accountImport: (json: string) => { ok: boolean; error?: string }
  refreshAccounts: () => void
}

const ContentContext = createContext<ContentContextValue | null>(null)

export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<SiteContent>(() => syncInitialContent())
  const [hydrated, setHydrated] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  const [admin, setAdminState] = useState(false)
  const [gateOpen, setGateOpen] = useState(false)
  const [accounts, setAccounts] = useState<AccountRecord[]>(() => loadAccounts())
  const [account, setAccount] = useState<AccountRecord | null>(() => {
    const id = currentAccountId()
    if (!id) return null
    return findAccountById(loadAccounts(), id) ?? null
  })
  const contentRef = useRef(content)
  const accountsRef = useRef(accounts)
  const accountRef = useRef(account)
  contentRef.current = content
  accountsRef.current = accounts
  accountRef.current = account

  const applyAccounts = useCallback((next: AccountRecord[]) => {
    saveAccounts(next)
    setAccounts(next)
    const id = currentAccountId()
    setAccount(id ? findAccountById(next, id) ?? null : null)
  }, [])

  // 刷新后根据已恢复的会话账号还原权限（管理员 → 全站编辑；成员 → 仅本人主页）
  useEffect(() => {
    const cur = accountRef.current
    if (!cur) return
    const isAdmin = cur.role === 'admin' && cur.status === 'approved'
    setAdminState(isAdmin)
    if (isAdmin) {
      try {
        sessionStorage.setItem('ttf-admin-authed', '1')
      } catch {
        // 忽略
      }
    }
  }, [accounts, account])

  /* ---------- 启动：IndexedDB 内容水合 + 账号初始化 ---------- */
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        if (idbSupported()) {
          const remote = await idbGet(CONTENT_KEY)
          if (cancelled) return
          if (remote) {
            const merged = parseContent(remote)
            if (merged) {
              setContent((prev) => {
                const same = JSON.stringify(prev) === JSON.stringify(merged)
                return same ? prev : merged
              })
            }
          } else {
            await idbSet(CONTENT_KEY, JSON.stringify(contentRef.current))
          }
        }
      } catch {
        // IndexedDB 不可用：回退 localStorage 模式
      } finally {
        if (!cancelled) setHydrated(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // 账号：预置三个管理员；旧单管理员凭据迁移为兼容别名
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const seeded = await ensureAccountsSeeded()
      let next = seeded
      try {
        const legacy = localStorage.getItem('ttf-admin-credentials')
        if (legacy && !findAccountByUsername(next, 'admin')) {
          const parsed = JSON.parse(legacy) as { username?: string; salt?: string; passwordHash?: string }
          if (parsed.username && parsed.salt && parsed.passwordHash) {
            const preset = accountPresets[0]
            next = [
              ...next,
              {
                id: uid('acct'),
                username: parsed.username,
                displayName: preset.displayName,
                role: 'admin' as const,
                status: 'approved' as const,
                salt: parsed.salt,
                passwordHash: parsed.passwordHash,
                memberId: preset.memberId,
                topic: preset.topic,
                bio: '',
                note: '由旧版管理员账号迁移',
                createdAt: Date.now(),
                updatedAt: Date.now(),
              },
            ]
            saveAccounts(next)
            localStorage.removeItem('ttf-admin-credentials')
            localStorage.removeItem('ttf-admin-session')
            sessionStorage.removeItem('ttf-admin-session')
            sessionStorage.removeItem('ttf-admin-authed')
          }
        }
      } catch {
        // 迁移失败不影响主流程
      }
      if (!cancelled) {
        setAccounts(next)
        const id = currentAccountId()
        if (id) setAccount(findAccountById(next, id) ?? null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  /* ---------- 自动保存：IndexedDB 主存储 + localStorage 小镜像 ---------- */
  useEffect(() => {
    if (!hydrated) return
    const json = JSON.stringify(content)
    setSaveState('saving')
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          if (idbSupported()) {
            await idbSet(CONTENT_KEY, json)
          }
          try {
            if (json.length <= MIRROR_LIMIT) {
              localStorage.setItem(CACHE_KEY, json)
            } else if (localStorage.getItem(CACHE_KEY)) {
              localStorage.removeItem(CACHE_KEY)
            }
            if (localStorage.getItem(LEGACY_KEY)) localStorage.removeItem(LEGACY_KEY)
          } catch {
            // localStorage 满：内容仍已写入 IndexedDB，不阻断
          }
          setSaveState('saved')
          setLastSavedAt(Date.now())
        } catch {
          setSaveState('error')
        }
      })()
    }, SAVE_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [content, hydrated])

  const setAdmin = useCallback((on: boolean) => {
    setAdminState(on)
    if (on) sessionStorage.setItem('ttf-admin-authed', '1')
    else sessionStorage.removeItem('ttf-admin-authed')
    window.dispatchEvent(new CustomEvent('ttf-admin', { detail: { on } }))
  }, [])

  const openGate = useCallback(() => setGateOpen(true), [])
  const closeGate = useCallback(() => setGateOpen(false), [])

  const setAt = useCallback((path: string, value: unknown) => {
    setContent((prev) => {
      const next = clone(prev)
      setByPath(next as unknown as Record<string | number, unknown>, path, value)
      return next
    })
  }, [])

  const updateList = useCallback((path: string, items: unknown[]) => {
    setContent((prev) => {
      const next = clone(prev)
      setByPath(next as unknown as Record<string | number, unknown>, path, items)
      return next
    })
  }, [])

  const exportJson = useCallback(() => JSON.stringify(content, null, 2), [content])

  const importJson = useCallback((json: string) => {
    try {
      setContent(parseContent(json) ?? clone(defaultContent))
      return true
    } catch {
      return false
    }
  }, [])

  const reset = useCallback(() => setContent(clone(defaultContent)), [])

  const refreshAccounts = useCallback(() => {
    const next = loadAccounts()
    setAccounts(next)
    const id = currentAccountId()
    setAccount(id ? findAccountById(next, id) ?? null : null)
  }, [])

  /* ---------- 账号动作 ---------- */
  const loginAccount = useCallback(
    async (username: string, password: string, remember: boolean) => {
      const result = await authenticateAccount(accountsRef.current, username, password, remember)
      if (!result.ok || !result.account) {
        const msg =
          result.error === 'pending'
            ? '该成员账号仍在等待管理员审核'
            : result.error === 'rejected'
              ? '该申请未通过审核，请联系管理员'
              : '用户名或密码错误'
        return { ok: false, error: msg }
      }
      const acc = result.account
      setAccount(acc ?? null)
      const isAdmin = acc.role === 'admin' && acc.status === 'approved'
      setAdminState(isAdmin)
      window.dispatchEvent(new CustomEvent('ttf-account', { detail: { account: acc } }))
      if (acc.role === 'member') setGateOpen(false)
      return { ok: true, isAdmin, account: acc }
    },
    [],
  )

  const registerAccount = useCallback(
    async (username: string, displayName: string, password: string, note?: string) => {
      const result = await registerMemberAccount(accountsRef.current, username, displayName, password, note)
      if (!result.ok || !result.account) return { ok: false, error: result.error ?? '注册失败' }
      applyAccounts([...accountsRef.current, result.account])
      return { ok: true }
    },
    [applyAccounts],
  )

  const logoutAccount = useCallback(() => {
    clearSession()
    setAccount(null)
    setAdminState(false)
    window.dispatchEvent(new CustomEvent('ttf-account', { detail: { account: null } }))
  }, [])

  /** 管理员审核通过：创建成员主页卡 + 作品集档案，并把账号绑定到该成员 */
  const approveAccount = useCallback(
    (accountId: string, topic?: string) => {
      const acc = findAccountById(accountsRef.current, accountId)
      if (!acc) return { ok: false, error: '账号不存在' }
      if (acc.role !== 'member' || acc.status !== 'pending') {
        return { ok: false, error: '仅待审核的成员账号可以执行通过操作' }
      }
      const chosenTopic = topic && topic !== '' ? topic : acc.topic && acc.topic !== '' ? acc.topic : 'quan-jiakong'
      const card = makeMemberCard(acc, chosenTopic)
      const nextAccounts = accountsRef.current.map((a) =>
        a.id === acc.id
          ? { ...a, status: 'approved' as const, memberId: card.id, topic: chosenTopic, updatedAt: Date.now() }
          : a,
      )
      setContent((prev) => {
        const next = clone(prev)
        if (!next.members.some((m) => m.id === card.id)) next.members = [...next.members, card]
        if (!next.worksArchive.some((w) => w.id === `wa-${card.id}`)) {
          next.worksArchive = [
            ...next.worksArchive,
            {
              id: `wa-${card.id}`,
              title: card.work.title,
              author: card.name,
              image: card.work.image,
              desc: card.work.desc,
              topic: chosenTopic,
              category: '历史地图',
            },
          ]
        }
        return next
      })
      applyAccounts(nextAccounts)
      return { ok: true }
    },
    [applyAccounts],
  )

  const rejectAccount = useCallback(
    (accountId: string) => {
      applyAccounts(
        accountsRef.current.map((a) =>
          a.id === accountId && a.role === 'member' && a.status === 'pending'
            ? { ...a, status: 'rejected' as const, updatedAt: Date.now() }
            : a,
        ),
      )
    },
    [applyAccounts],
  )

  const deleteAccount = useCallback(
    (accountId: string) => {
      applyAccounts(accountsRef.current.filter((a) => a.id !== accountId))
      const cur = accountRef.current
      if (cur && cur.id === accountId) {
        clearSession()
        setAccount(null)
        setAdminState(false)
      }
    },
    [applyAccounts],
  )

  /** 成员/管理员本人资料同步：显示名、简介、主题偏好（头像/作品通过内容编辑写入） */
  const accountUpdateMeta = useCallback(
    (patch: Partial<Pick<AccountRecord, 'displayName' | 'bio' | 'topic'>>) => {
      const cur = accountRef.current
      if (!cur) return { ok: false, error: '未登录' }
      const nextAccounts = accountsRef.current.map((a) =>
        a.id === cur.id ? { ...a, ...patch, updatedAt: Date.now() } : a,
      )
      if (cur.memberId) {
        setContent((prev) => {
          const idx = prev.members.findIndex((m) => m.id === cur.memberId)
          if (idx < 0) return prev
          const next = clone(prev)
          if (typeof patch.displayName === 'string' && patch.displayName.trim()) {
            next.members[idx].name = patch.displayName.trim()
          }
          if (typeof patch.bio === 'string') {
            next.members[idx].bio = patch.bio
          }
          if (typeof patch.topic === 'string' && patch.topic) {
            next.members[idx].topic = patch.topic
          }
          return next
        })
      }
      applyAccounts(nextAccounts)
      return { ok: true }
    },
    [applyAccounts],
  )

  const changeMyPassword = useCallback(
    async (oldPassword: string, newPassword: string) => {
      const cur = accountRef.current
      if (!cur) return { ok: false, error: '未登录' }
      if (newPassword.trim().length < 4) return { ok: false, error: '新密码至少 4 位' }
      const ok = await verifyAccountPassword(cur, oldPassword)
      if (!ok) return { ok: false, error: '旧密码不正确' }
      const salt = `${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
      const passwordHash = await sha256(`${salt}:${newPassword}`)
      applyAccounts(
        accountsRef.current.map((a) => (a.id === cur.id ? { ...a, salt, passwordHash, updatedAt: Date.now() } : a)),
      )
      return { ok: true }
    },
    [applyAccounts],
  )

  const adminResetPassword = useCallback(
    async (accountId: string, newPassword: string) => {
      if (newPassword.trim().length < 4) return { ok: false, error: '新密码至少 4 位' }
      const target = findAccountById(accountsRef.current, accountId)
      if (!target) return { ok: false, error: '账号不存在' }
      const salt = `${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
      const passwordHash = await sha256(`${salt}:${newPassword}`)
      applyAccounts(
        accountsRef.current.map((a) => (a.id === accountId ? { ...a, salt, passwordHash, updatedAt: Date.now() } : a)),
      )
      return { ok: true }
    },
    [applyAccounts],
  )

  const accountExport = useCallback(() => {
    return JSON.stringify(
      accounts.map((a) => ({
        id: a.id,
        username: a.username,
        displayName: a.displayName,
        role: a.role,
        status: a.status,
        memberId: a.memberId,
        topic: a.topic,
        bio: a.bio,
        note: a.note,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      })),
      null,
      2,
    )
  }, [accounts])

  const accountImport = useCallback(
    (json: string) => {
      try {
        const parsed = JSON.parse(json)
        if (!Array.isArray(parsed)) return { ok: false, error: '账号 JSON 必须是数组' }
        const clean = parsed
          .filter((a) => a && typeof a.id === 'string' && typeof a.username === 'string')
          .map((a) => ({
            id: a.id,
            username: String(a.username).trim(),
            displayName: a.displayName || a.username,
            role: a.role === 'admin' ? ('admin' as const) : ('member' as const),
            status:
              a.status === 'approved' || a.status === 'rejected'
                ? (a.status as 'approved' | 'rejected')
                : ('pending' as const),
            salt: '',
            passwordHash: '',
            memberId: typeof a.memberId === 'string' ? a.memberId : undefined,
            bio: typeof a.bio === 'string' ? a.bio : '',
            note: typeof a.note === 'string' ? a.note : '',
            topic: typeof a.topic === 'string' ? a.topic : undefined,
            createdAt: typeof a.createdAt === 'number' ? a.createdAt : Date.now(),
            updatedAt: typeof a.updatedAt === 'number' ? a.updatedAt : Date.now(),
          }))
        const existing = accountsRef.current.filter(
          (a) => !clean.some((c) => c.id === a.id || c.username.toLowerCase() === a.username.toLowerCase()),
        )
        applyAccounts([...existing, ...clean])
        return { ok: true }
      } catch {
        return { ok: false, error: 'JSON 解析失败' }
      }
    },
    [applyAccounts],
  )

  const saveError = saveState === 'error'
  const clearSaveError = useCallback(() => setSaveState('idle'), [])

  const value = useMemo<ContentContextValue>(
    () => ({
      content,
      admin,
      gateOpen,
      hydrated,
      saveState,
      lastSavedAt,
      accounts,
      account,
      setAdmin,
      openGate,
      closeGate,
      setAt,
      updateList,
      exportJson,
      importJson,
      saveError,
      clearSaveError,
      reset,
      loginAccount,
      registerAccount,
      logoutAccount,
      approveAccount,
      rejectAccount,
      deleteAccount,
      accountUpdateMeta,
      changeMyPassword,
      adminResetPassword,
      accountExport,
      accountImport,
      refreshAccounts,
    }),
    [
      content,
      admin,
      gateOpen,
      hydrated,
      saveState,
      lastSavedAt,
      accounts,
      account,
      setAdmin,
      openGate,
      closeGate,
      setAt,
      updateList,
      exportJson,
      importJson,
      saveError,
      clearSaveError,
      reset,
      loginAccount,
      registerAccount,
      logoutAccount,
      approveAccount,
      rejectAccount,
      deleteAccount,
      accountUpdateMeta,
      changeMyPassword,
      adminResetPassword,
      accountExport,
      accountImport,
      refreshAccounts,
    ],
  )

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>
}

export function useContent() {
  const ctx = useContext(ContentContext)
  if (!ctx) throw new Error('useContent 必须在 ContentProvider 内使用')
  return ctx
}
