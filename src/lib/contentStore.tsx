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
  uiText as defaultUiText,
  mediaContent as defaultMedia,
  homeAtlasContent as defaultHomeAtlas,
  type Member,
  type WorkItem,
} from '../config/site'
import {
  type AccountRecord,
  ACCOUNTS_STORAGE_KEY,
  accountPresets,
  authenticateAccount,
  clearSession,
  currentAccountId,
  ensureAccountsSeeded,
  reconcilePresetAdmins,
  exportMemberAccountMetadata,
  mergeMemberAccountMetadata,
  filterEditableProfilePatch,
  findAccountById,
  findAccountByUsername,
  loadAccounts,
  parseAccounts,
  registerMemberAccount,
  saveAccounts,
  validateMemberRegistration,
  verifyAccountPassword,
  sha256,
} from './accounts'
import { CONTENT_KEY, idbGet, idbSet, idbSetMany, idbSupported } from './idbStore'
import { attachApprovedMember, makeApprovedMemberCard } from './memberFactory'
import { classifyCloudSnapshot, compareCloudVersions, isCurrentCloudSave } from './cloudVersion'
import { prepareSharedImages } from './sharedImages'
import {
  approveCloudMember,
  changeCloudPassword,
  completeCloudPasswordRecovery,
  deleteCloudMemberAccount,
  getCloudProfile,
  getCloudSessionUser,
  listCloudMemberApplications,
  listCloudProfiles,
  loadSharedContentSnapshot,
  CloudContentConflictError,
  registerCloudMember,
  saveSharedContent,
  initializeSharedContent,
  subscribeCloudAuth,
  sendCloudPasswordReset,
  setCloudMemberStatus,
  signInCloudAccount,
  signOutCloudAccount,
  subscribeCloudProfiles,
  subscribeSharedContent,
  supabaseConfigured,
  updateCloudMemberProfile,
  updateMyCloudProfile,
  uploadCloudImage,
  type CloudMemberApplication,
  type CloudProfile,
} from './supabase'

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
  ui: typeof defaultUiText
  media: typeof defaultMedia
  homeAtlas: typeof defaultHomeAtlas
}

// v4：内容主存储迁移至 IndexedDB（可容纳含 Base64 大图的内容），localStorage 仅保留小体积镜像。
const CACHE_KEY = 'ttf-content-cache-v4'
const LEGACY_KEY = 'ttf-admin-content-v3'
const ACCOUNTS_DB_KEY = 'accounts-v1'
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
  ui: defaultUiText,
  media: defaultMedia,
  homeAtlas: defaultHomeAtlas,
}

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'
export type CloudSyncState = 'disabled' | 'connecting' | 'ready' | 'uninitialized' | 'error' | 'conflict'

function cloudAccount(profile: CloudProfile | CloudMemberApplication, email?: string): AccountRecord {
  const createdAt = Date.parse(profile.created_at)
  const role = 'role' in profile ? profile.role : 'member'
  return {
    id: profile.id,
    username: profile.username,
    email: email ?? ('email' in profile ? profile.email : undefined),
    displayName: profile.display_name,
    role: role === 'admin' ? 'admin' : 'member',
    status: profile.status,
    salt: 'supabase-auth',
    passwordHash: '',
    memberId: profile.member_id ?? undefined,
    bio: 'bio' in profile ? profile.bio : undefined,
    note: 'note' in profile ? profile.note : undefined,
    topic: profile.topic ?? undefined,
    avatar: 'avatar' in profile ? profile.avatar : undefined,
    createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
    updatedAt: 'updated_at' in profile ? Date.parse(profile.updated_at) || Date.now() : createdAt,
  }
}

function isCloudSiteContent(value: unknown): value is Partial<SiteContent> {
  return Boolean(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.keys(value as Record<string, unknown>).length > 0,
  )
}

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

interface PersistedContentSnapshot {
  content: SiteContent
  savedAt: number
  cloudDraft?: { updatedAt: string }
}

/** Upgrade only known old defaults; preserve all authored text and uploaded images. */
function withArchiveDefaults(content: SiteContent): SiteContent {
  const oldHint = '作品收在文件夹里，露出边缘等待翻阅；悬停抽出查看，点击进入成员个人页。'
  const oldEarthIntro = '悬停右侧关键词目录，指南针星核会同步回应，并在数码地球旁浮现对应内容。此处为占位内容，后续替换为正式说明。'
  // 新增公开成员时，旧版 localStorage / IndexedDB 快照的数组会整体覆盖默认数组。
  // 仅把这个明确的新种子追加到旧快照，既不覆盖管理员已有编辑，也不会让新增成员在旧浏览器里消失。
  const seededMemberIds = new Set(['gebi-lao-yinhe', 'helietis', 'topiatsiak'])
  const legacyHelietisBio = '为了写小说误入地图圈，主攻架空世界构建，擅长制作仿真架空地形，并尝试多样性的风格化地图。主力工具为 Photoshop、QGIS 与 Gaea 2。'
  const members = [...content.members]
  const worksArchive = [...content.worksArchive]
  defaultContent.members.forEach((seed) => {
    if (!seededMemberIds.has(seed.id)) return
    const existingIndex = members.findIndex((member) => member.id === seed.id)
    if (existingIndex >= 0) {
      const existing = members[existingIndex]
      // 只补新字段；管理员已经写过的资料始终优先。这个兼容分支用于已在本机
      // 载入过赫列提斯旧版本资料的浏览器，让 QQ 昵称和社交平台说明正常出现。
      members[existingIndex] = {
        ...existing,
        contactName: existing.contactName ?? seed.contactName,
        bio: seed.id === 'helietis' && existing.bio === legacyHelietisBio ? seed.bio : existing.bio,
      }
      return
    }
    members.push(seed)
    defaultContent.worksArchive
      .filter((work) => work.authorMemberId === seed.id)
      .forEach((work) => {
        if (!worksArchive.some((entry) => entry.id === work.id)) worksArchive.push(work)
      })
  })
  return { ...content, site: { ...content.site, nav: content.site.nav.map((item) =>
    item.href === '#earth' && item.label === '数码地球' ? { ...item, label: defaultSite.nav[3].label, desc: defaultSite.nav[3].desc } : item),
  }, earth: { ...content.earth,
    subtitle: content.earth.subtitle === '以文字与代码构建的世界' ? defaultEarth.subtitle : content.earth.subtitle,
  }, ui: { ...content.ui,
    earth: { ...content.ui.earth, intro: content.ui.earth.intro === oldEarthIntro ? defaultUiText.earth.intro : content.ui.earth.intro },
    works: { ...content.ui.works, openHint: content.ui.works.openHint === oldHint ? defaultUiText.works.openHint : content.ui.works.openHint },
    home: { ...content.ui.home, primaryCta: content.ui.home.primaryCta === '进入天图府' ? defaultUiText.home.primaryCta : content.ui.home.primaryCta },
  }, members: members.map((member) => {
    const seed = defaultContent.members.find((entry) => entry.id === member.id)
    return seed?.work.fullImage && !member.work.fullImage && member.work.image === seed.work.image
      ? { ...member, work: { ...member.work, fullImage: seed.work.fullImage } } : member
  }), worksArchive }
}

function parsePersistedContent(json: string | null): PersistedContentSnapshot | null {
  if (!json) return null
  try {
    const parsed = JSON.parse(json) as unknown
    if (parsed && typeof parsed === 'object' && 'schema' in parsed && parsed.schema === 'ttf-site-content-v1') {
      const envelope = parsed as { content?: unknown; savedAt?: unknown; cloudDraft?: { updatedAt?: unknown } }
      if (!envelope.content || typeof envelope.content !== 'object' || Array.isArray(envelope.content)) return null
      return {
        content: withArchiveDefaults(deepMerge(defaultContent, envelope.content)),
        savedAt: typeof envelope.savedAt === 'number' && Number.isFinite(envelope.savedAt) ? envelope.savedAt : 0,
        cloudDraft: typeof envelope.cloudDraft?.updatedAt === 'string' ? { updatedAt: envelope.cloudDraft.updatedAt } : undefined,
      }
    }
    // 兼容 v3/localStorage 与早期 v4/IndexedDB 的裸内容 JSON。
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return { content: withArchiveDefaults(deepMerge(defaultContent, parsed)), savedAt: 0 }
  } catch {
    return null
  }
}

function parseContent(json: string | null): SiteContent | null {
  return parsePersistedContent(json)?.content ?? null
}

function serializeContent(content: SiteContent, savedAt = Date.now(), cloudDraft?: { updatedAt: string }): string {
  return JSON.stringify({ schema: 'ttf-site-content-v1', savedAt, content, cloudDraft })
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

interface ContentContextValue {
  content: SiteContent
  /** 当前是否处于“全站管理员编辑”模式 */
  admin: boolean
  gateOpen: boolean
  hydrated: boolean
  /** 账号表已从本机存储加载完成 */
  accountsReady: boolean
  saveState: SaveState
  accountSaveState: SaveState
  cloudMode: boolean
  cloudSyncState: CloudSyncState
  initializeCloudContent: () => Promise<{ ok: boolean; error?: string }>
  retryCloudSync: () => Promise<void>
  restoreCloudContent: () => Promise<{ ok: boolean; error?: string }>
  passwordRecoveryOpen: boolean
  completePasswordRecovery: (password: string) => Promise<{ ok: boolean; error?: string }>
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
  importJson: (json: string) => Promise<{ ok: boolean; error?: string }>
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
    email?: string,
  ) => Promise<{ ok: boolean; error?: string }>
  logoutAccount: () => void
  approveAccount: (accountId: string, topic?: string) => Promise<{ ok: boolean; error?: string }>
  rejectAccount: (accountId: string) => Promise<{ ok: boolean; error?: string }>
  deleteAccount: (accountId: string) => Promise<{ ok: boolean; error?: string }>
  accountUpdateMeta: (patch: Partial<Pick<AccountRecord, 'displayName' | 'bio' | 'topic' | 'avatar'>>) => Promise<{
    ok: boolean
    error?: string
  }>
  changeMyPassword: (oldPassword: string, newPassword: string) => Promise<{ ok: boolean; error?: string }>
  adminResetPassword: (accountId: string, newPassword: string) => Promise<{ ok: boolean; error?: string }>
  accountExport: () => string
  accountImport: (json: string) => Promise<{ ok: boolean; error?: string }>
  refreshAccounts: () => void
}

const ContentContext = createContext<ContentContextValue | null>(null)

export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<SiteContent>(() => syncInitialContent())
  const [hydrated, setHydrated] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [accountSaveState, setAccountSaveState] = useState<SaveState>('idle')
  const [cloudMode] = useState(supabaseConfigured)
  const [cloudSyncState, setCloudSyncState] = useState<CloudSyncState>(supabaseConfigured ? 'connecting' : 'disabled')
  const [passwordRecoveryOpen, setPasswordRecoveryOpen] = useState(false)
  const [accountsReady, setAccountsReady] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  const [admin, setAdminState] = useState(false)
  const [gateOpen, setGateOpen] = useState(false)
  const [accounts, setAccounts] = useState<AccountRecord[]>(() => (supabaseConfigured ? [] : loadAccounts()))
  const [account, setAccount] = useState<AccountRecord | null>(() => {
    if (supabaseConfigured) return null
    const id = currentAccountId()
    if (!id) return null
    return findAccountById(loadAccounts(), id) ?? null
  })
  const contentRef = useRef(content)
  const accountsRef = useRef(accounts)
  const accountRef = useRef(account)
  const syncChannelRef = useRef<BroadcastChannel | null>(null)
  const remoteContentRef = useRef(false)
  const skipCloudSaveRef = useRef(false)
  const cloudContentInitializedRef = useRef(false)
  const cloudDraftDirtyRef = useRef(false)
  const cloudVersionRef = useRef('')
  const cloudLatestVersionRef = useRef('')
  const cloudSavingJsonRef = useRef<string | null>(null)
  const cloudSaveTailRef = useRef<Promise<void>>(Promise.resolve())
  const saveStateRef = useRef(saveState)
  const hydratedRef = useRef(hydrated)
  contentRef.current = content
  accountsRef.current = accounts
  accountRef.current = account
  saveStateRef.current = saveState
  hydratedRef.current = hydrated

  const acceptCloudContent = useCallback((value: unknown, updatedAt: string) => {
    if (updatedAt && compareCloudVersions(updatedAt, cloudLatestVersionRef.current) < 0) return
    if (updatedAt) cloudLatestVersionRef.current = updatedAt
    if (!isCloudSiteContent(value)) {
      cloudContentInitializedRef.current = false
      setCloudSyncState('uninitialized')
      return
    }
    const next = withArchiveDefaults(deepMerge(defaultContent, value))
    const incomingJson = JSON.stringify(next)
    cloudContentInitializedRef.current = true
    const decision = classifyCloudSnapshot({
      currentJson: JSON.stringify(contentRef.current), incomingJson,
      dirty: cloudDraftDirtyRef.current, savingJson: cloudSavingJsonRef.current,
      incomingVersion: updatedAt, baseVersion: cloudVersionRef.current,
      newestVersion: cloudLatestVersionRef.current,
    })
    if (decision !== 'accept') {
      if (decision === 'own-echo') {
        // This is our older in-flight save's echo, not the newer open draft.
        cloudVersionRef.current = updatedAt
        return
      }
      if (decision === 'same-base') {
        setCloudSyncState((state) => state === 'conflict' ? state : 'ready')
        return
      }
      if (decision === 'conflict') setCloudSyncState('conflict')
      return
    }
    cloudVersionRef.current = updatedAt
    cloudDraftDirtyRef.current = false
    remoteContentRef.current = true
    skipCloudSaveRef.current = true
    contentRef.current = next
    setContent((previous) => JSON.stringify(previous) === incomingJson ? previous : next)
    setCloudSyncState('ready')
  }, [])

  const applyAccounts = useCallback((next: AccountRecord[], contentSnapshot?: SiteContent) => {
    const previous = accountsRef.current
    let previousContentMirror: string | null = null
    if (contentSnapshot) {
      try {
        previousContentMirror = localStorage.getItem(CACHE_KEY)
      } catch {
        // Mirror is optional when IndexedDB is available.
      }
    }
    const contentSavedAt = Date.now()
    const serializedContent = contentSnapshot ? serializeContent(contentSnapshot, contentSavedAt) : null
    const localSaved = saveAccounts(next)
    let localContentSaved = !contentSnapshot
    if (contentSnapshot) {
      try {
        localStorage.setItem(CACHE_KEY, serializedContent as string)
        localContentSaved = true
      } catch {
        // IndexedDB may still persist both records atomically.
      }
    }
    setAccounts(next)
    const id = currentAccountId()
    setAccount(id ? findAccountById(next, id) ?? null : null)
    setAccountSaveState('saving')

    return (async () => {
      let indexedSaved = false
      if (idbSupported()) {
        try {
          if (contentSnapshot) {
            await idbSetMany([
              [ACCOUNTS_DB_KEY, JSON.stringify(next)],
              [CONTENT_KEY, serializedContent as string],
            ])
          } else {
            await idbSet(ACCOUNTS_DB_KEY, JSON.stringify(next))
          }
          indexedSaved = true
        } catch {
          // localStorage may still provide a durable fallback.
        }
      }
      const contentDurable = !contentSnapshot || indexedSaved || localContentSaved
      if ((localSaved || indexedSaved) && contentDurable) {
        if (contentSnapshot) {
          setContent(contentSnapshot)
          setSaveState('saved')
          setLastSavedAt(contentSavedAt)
          syncChannelRef.current?.postMessage({ type: 'content', content: JSON.stringify(contentSnapshot) })
        }
        setAccountSaveState('saved')
        syncChannelRef.current?.postMessage({ type: 'accounts', accounts: next })
        return true
      }
      // 账号/成员联动数据至少有一侧未能持久化，恢复账号状态，避免 UI 假报成功。
      saveAccounts(previous)
      if (contentSnapshot && localContentSaved && !indexedSaved) {
        try {
          if (previousContentMirror !== null) localStorage.setItem(CACHE_KEY, previousContentMirror)
          else localStorage.removeItem(CACHE_KEY)
        } catch {
          // Restore may fail when storage is full; keep the visible error state.
        }
      }
      setAccounts(previous)
      setAccount(id ? findAccountById(previous, id) ?? null : null)
      setAccountSaveState('error')
      return false
    })()
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
      let localSnapshot: PersistedContentSnapshot | null = null
      try {
        localSnapshot = parsePersistedContent(localStorage.getItem(CACHE_KEY)) ??
          parsePersistedContent(localStorage.getItem(LEGACY_KEY))
      } catch {
        // IndexedDB may still be available when the synchronous mirror is blocked.
      }
      let indexedSnapshot: PersistedContentSnapshot | null = null
      try {
        if (idbSupported()) {
          const remote = await idbGet(CONTENT_KEY)
          if (cancelled) return
          indexedSnapshot = parsePersistedContent(remote)
        }
      } catch {
        // A failed IndexedDB open must not skip recovery of the mirror's draft marker.
      }
      if (cancelled) return
      const newestSnapshot = localSnapshot && (!indexedSnapshot || localSnapshot.savedAt > indexedSnapshot.savedAt)
        ? localSnapshot : indexedSnapshot
      if (newestSnapshot) {
        if (supabaseConfigured && newestSnapshot.cloudDraft) {
          cloudDraftDirtyRef.current = true
          cloudVersionRef.current = newestSnapshot.cloudDraft.updatedAt
        }
        contentRef.current = newestSnapshot.content
        setContent((prev) => JSON.stringify(prev) === JSON.stringify(newestSnapshot.content) ? prev : newestSnapshot.content)
      }
      setHydrated(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // 账号：先恢复 IndexedDB/本地镜像，再补三个管理员种子账号与旧版凭据迁移。
  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (supabaseConfigured) {
        setAccounts([])
        setAccount(null)
        setAdminState(false)
        return
      }
      const localAccounts = loadAccounts()
      let indexedAccounts: AccountRecord[] = []
      try {
        const stored = idbSupported() ? await idbGet(ACCOUNTS_DB_KEY) : null
        indexedAccounts = parseAccounts(stored)
      } catch {
        // IndexedDB 不可用时使用 localStorage 镜像。
      }

      const newest = (records: AccountRecord[]) => records.reduce((time, row) => Math.max(time, row.updatedAt || 0), 0)
      let next =
        indexedAccounts.length > 0 && (!localAccounts.length || newest(indexedAccounts) > newest(localAccounts))
          ? indexedAccounts
          : localAccounts
      if (next.length === 0) next = await ensureAccountsSeeded()

      try {
        const legacy = localStorage.getItem('ttf-admin-credentials')
        if (legacy) {
          const parsed = JSON.parse(legacy) as { username?: string; salt?: string; passwordHash?: string }
          if (parsed.username && parsed.salt && parsed.passwordHash) {
            const primary = next.find((account) => account.id === accountPresets[0].id)
            const conflict = findAccountByUsername(next, parsed.username)
            const conflictIsExtraAdmin =
              conflict?.role === 'admin' && !accountPresets.some((preset) => preset.id === conflict.id)
            if (primary && (!conflict || conflict.id === primary.id || conflictIsExtraAdmin)) {
              const credential = conflictIsExtraAdmin
                ? { username: conflict.username, salt: conflict.salt, passwordHash: conflict.passwordHash }
                : { username: parsed.username, salt: parsed.salt, passwordHash: parsed.passwordHash }
              const aliases = primary.loginAliases ?? []
              if (!aliases.some((alias) => alias.username.toLowerCase() === credential.username.toLowerCase())) {
                primary.loginAliases = [...aliases, credential]
              }
              if (conflictIsExtraAdmin && conflict) next = next.filter((account) => account.id !== conflict.id)
            }
          }
          localStorage.removeItem('ttf-admin-credentials')
          localStorage.removeItem('ttf-admin-session')
          sessionStorage.removeItem('ttf-admin-session')
          sessionStorage.removeItem('ttf-admin-authed')
        }
      } catch {
        // 迁移失败不影响主流程
      }

      next = await reconcilePresetAdmins(next)

      const localSaved = saveAccounts(next)
      let indexedSaved = false
      if (idbSupported()) {
        try {
          await idbSet(ACCOUNTS_DB_KEY, JSON.stringify(next))
          indexedSaved = true
        } catch {
          // 尝试继续使用已写入的 localStorage 镜像。
        }
      }
      if (!cancelled) {
        setAccounts(next)
        const id = currentAccountId()
        if (id) setAccount(findAccountById(next, id) ?? null)
        setAccountsReady(true)
        setAccountSaveState(localSaved || indexedSaved ? 'saved' : 'error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  /* ---------- 云端：共享内容、认证会话与管理员审核列表 ---------- */
  useEffect(() => {
    if (!supabaseConfigured || !hydrated) return
    let cancelled = false
    let unsubscribeAuth: (() => void) | undefined
    let unsubscribeRealtime: (() => void) | undefined
    let unsubscribeProfiles: (() => void) | undefined
    let userSyncRevision = 0

    const clearCloudAccount = () => {
      setAccounts([])
      setAccount(null)
      setAdminState(false)
      setAccountsReady(true)
      setAccountSaveState('saved')
      window.dispatchEvent(new CustomEvent('ttf-account', { detail: { account: null } }))
    }

    const syncCloudAccount = async (userId: string | null) => {
      const revision = ++userSyncRevision
      if (!userId) {
        if (!cancelled && revision === userSyncRevision) clearCloudAccount()
        return
      }
      setAccountsReady(false)
      try {
        const profile = await getCloudProfile(userId)
        if (cancelled || revision !== userSyncRevision) return
        if (!profile || profile.status !== 'approved') {
          // A stored Supabase session must not keep a pending/rejected member
          // authenticated after refresh or an admin status change.
          await signOutCloudAccount().catch(() => undefined)
          if (cancelled || revision !== userSyncRevision) return
          clearCloudAccount()
          setAccountSaveState(profile ? 'saved' : 'error')
          return
        }

        const self = cloudAccount(profile)
        setAccount(self)
        const isAdmin = self.role === 'admin' && self.status === 'approved'
        setAdminState(isAdmin)
        window.dispatchEvent(new CustomEvent('ttf-account', { detail: { account: self } }))

        if (isAdmin) {
          const [profiles, applications] = await Promise.all([listCloudProfiles(), listCloudMemberApplications()])
          if (cancelled || revision !== userSyncRevision) return
          const applicationById = new Map(applications.map((application) => [application.id, application]))
          const next = profiles.map((item) => {
            const application = applicationById.get(item.id)
            return { ...cloudAccount(item, application?.email ?? (item.id === self.id ? self.email : undefined)), note: application?.note }
          })
          setAccounts(next)
          setAccount(next.find((item) => item.id === self.id) ?? self)
        } else {
          const profiles = await listCloudProfiles()
          if (cancelled || revision !== userSyncRevision) return
          const next = profiles.map((item) => cloudAccount(item, item.id === self.id ? self.email : undefined))
          setAccounts(next)
          setAccount(next.find((item) => item.id === self.id) ?? self)
        }
        setAccountsReady(true)
        setAccountSaveState('saved')
      } catch {
        if (cancelled || revision !== userSyncRevision) return
        setAccountsReady(true)
        setAccountSaveState('error')
      }
    }

    const syncCloudContent = async () => {
      try {
        const shared = await loadSharedContentSnapshot<unknown>()
        if (cancelled) return
        acceptCloudContent(shared?.content, shared?.updatedAt ?? '')
      } catch {
        if (!cancelled) setCloudSyncState('error')
      }
    }

    void syncCloudContent()
    void getCloudSessionUser()
      .then((user) => syncCloudAccount(user?.id ?? null))
      .catch(() => {
        if (!cancelled) {
          setAccountsReady(true)
          setAccountSaveState('error')
        }
      })

    void subscribeCloudAuth((userId, event) => {
      // Supabase warns against awaiting auth-dependent requests inside its auth callback.
      window.setTimeout(() => {
        if (cancelled) return
        if (event === 'PASSWORD_RECOVERY') setPasswordRecoveryOpen(true)
        void syncCloudAccount(userId)
      }, 0)
    }).then((unsubscribe) => {
      if (cancelled) unsubscribe()
      else unsubscribeAuth = unsubscribe
    }).catch(() => {
      if (!cancelled) setAccountSaveState('error')
    })

    void subscribeSharedContent((value, updatedAt) => {
      if (!cancelled) acceptCloudContent(value, updatedAt)
    }, (status) => {
      if (cancelled) return
      // Reconnect catches updates missed while the WebSocket was unavailable.
      if (status === 'SUBSCRIBED') void syncCloudContent()
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setCloudSyncState('error')
    }).then((unsubscribe) => {
      if (cancelled) unsubscribe()
      else unsubscribeRealtime = unsubscribe
    }).catch(() => {
      if (!cancelled) setCloudSyncState((state) => (state === 'ready' ? state : 'error'))
    })

    void subscribeCloudProfiles(() => {
      if (cancelled) return
      // Defer auth-dependent reads out of the Realtime callback.
      window.setTimeout(() => {
        if (cancelled) return
        void getCloudSessionUser()
          .then((user) => syncCloudAccount(user?.id ?? null))
          .catch(() => {
            if (!cancelled) setAccountSaveState('error')
          })
      }, 0)
    }).then((unsubscribe) => {
      if (cancelled) unsubscribe()
      else unsubscribeProfiles = unsubscribe
    }).catch(() => {
      if (!cancelled) setAccountSaveState('error')
    })

    return () => {
      cancelled = true
      userSyncRevision += 1
      unsubscribeAuth?.()
      unsubscribeRealtime?.()
      unsubscribeProfiles?.()
    }
  }, [hydrated, acceptCloudContent])

  // 同源标签页实时同步。此机制覆盖同一浏览器/设备，不伪装成公网跨设备同步。
  useEffect(() => {
    if (supabaseConfigured) return // Cloud Realtime, not unpublished same-browser drafts, is authoritative.
    const applyRemoteAccounts = (records: unknown) => {
      if (!Array.isArray(records)) return
      const next = parseAccounts(JSON.stringify(records))
      setAccounts(next)
      const id = currentAccountId()
      setAccount(id ? findAccountById(next, id) ?? null : null)
      setAccountsReady(true)
      setAccountSaveState('saved')
    }

    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('ttf-site-sync-v1') : null
    syncChannelRef.current = channel
    if (channel) {
      channel.onmessage = (event: MessageEvent<{ type?: string; content?: string; accounts?: unknown }>) => {
        if (event.data?.type === 'content' && typeof event.data.content === 'string') {
          const next = parseContent(event.data.content)
          if (!next) return
          setContent((prev) => {
            if (JSON.stringify(prev) === JSON.stringify(next)) return prev
            remoteContentRef.current = true
            skipCloudSaveRef.current = true
            return next
          })
        }
        if (event.data?.type === 'accounts') applyRemoteAccounts(event.data.accounts)
      }
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key === CACHE_KEY && event.newValue) {
        const next = parseContent(event.newValue)
        if (next) {
          setContent((prev) => {
            if (JSON.stringify(prev) === JSON.stringify(next)) return prev
            remoteContentRef.current = true
            skipCloudSaveRef.current = true
            return next
          })
        }
      }
      if (event.key === ACCOUNTS_STORAGE_KEY && event.newValue) {
        applyRemoteAccounts(parseAccounts(event.newValue))
      }
    }

    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('storage', onStorage)
      channel?.close()
      if (syncChannelRef.current === channel) syncChannelRef.current = null
    }
  }, [])

  /* ---------- 自动保存：IndexedDB 主存储 + localStorage 小镜像 ---------- */
  useEffect(() => {
    if (!hydrated) return
    const json = JSON.stringify(content)
    const serialized = serializeContent(content, Date.now(), cloudDraftDirtyRef.current ? { updatedAt: cloudVersionRef.current } : undefined)
    const shouldBroadcast = !cloudMode && !remoteContentRef.current
    remoteContentRef.current = false
    const shouldSaveCloud =
      cloudMode && admin && cloudSyncState === 'ready' && cloudContentInitializedRef.current && cloudDraftDirtyRef.current && !skipCloudSaveRef.current
    skipCloudSaveRef.current = false
    setSaveState('saving')
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          let durable = false
          const hasIndexedDb = idbSupported()
          if (hasIndexedDb) {
            try {
              await idbSet(CONTENT_KEY, serialized)
              durable = true
            } catch {
              // Fall back to the local mirror and report failure only if both stores fail.
            }
          }

          try {
            if (serialized.length <= MIRROR_LIMIT || !durable) {
              localStorage.setItem(CACHE_KEY, serialized)
              durable = true
            } else if (localStorage.getItem(CACHE_KEY)) {
              localStorage.removeItem(CACHE_KEY)
            }
            if (localStorage.getItem(LEGACY_KEY)) localStorage.removeItem(LEGACY_KEY)
          } catch {
            // IndexedDB remains the durable primary store when the small local mirror is full.
          }
          if (!durable) throw new Error('浏览器本地存储不可用或空间不足')
          if (shouldSaveCloud) {
            const save = cloudSaveTailRef.current.catch(() => undefined).then(async () => {
              // A queued snapshot superseded by newer typing must not publish.
              if (JSON.stringify(contentRef.current) !== json) return
              cloudSavingJsonRef.current = json
              try {
                const saved = await saveSharedContent(content, cloudVersionRef.current)
                if (compareCloudVersions(saved.updatedAt, cloudLatestVersionRef.current) < 0) {
                  setCloudSyncState('conflict')
                  return
                }
                cloudVersionRef.current = saved.updatedAt
                cloudLatestVersionRef.current = saved.updatedAt
                if (isCurrentCloudSave(JSON.stringify(contentRef.current), json, saved.updatedAt, cloudLatestVersionRef.current)) {
                  cloudDraftDirtyRef.current = false
                  // Also remove the durable pending marker after confirmation.
                  const confirmed = serializeContent(content)
                  if (idbSupported()) await idbSet(CONTENT_KEY, confirmed)
                  if (confirmed.length <= MIRROR_LIMIT) localStorage.setItem(CACHE_KEY, confirmed)
                }
                setCloudSyncState((state) => state === 'conflict' ? state : 'ready')
              } finally {
                if (cloudSavingJsonRef.current === json) cloudSavingJsonRef.current = null
              }
            })
            cloudSaveTailRef.current = save
            await save
          }
          if (JSON.stringify(contentRef.current) === json) setSaveState('saved')
          setLastSavedAt(Date.now())
          if (shouldBroadcast) syncChannelRef.current?.postMessage({ type: 'content', content: json })
        } catch (error) {
          setSaveState('error')
          if (shouldSaveCloud) setCloudSyncState(error instanceof CloudContentConflictError ? 'conflict' : 'error')
        }
      })()
    }, SAVE_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [content, hydrated, cloudMode, admin, cloudSyncState])

  // 页面关闭/刷新恰好发生在 300ms 防抖窗口内时，同步写一份小型镜像以免丢最后一次编辑。
  // 大于镜像上限且仍在保存的内容会触发浏览器原生离开确认，给 IndexedDB 留出完成时间。
  useEffect(() => {
    const flushMirror = () => {
      if (!hydratedRef.current) return
      const serialized = serializeContent(contentRef.current, Date.now(), cloudDraftDirtyRef.current ? { updatedAt: cloudVersionRef.current } : undefined)
      if (serialized.length <= MIRROR_LIMIT) {
        try {
          localStorage.setItem(CACHE_KEY, serialized)
        } catch {
          // IndexedDB 会继续作为主存储。
        }
      }
    }
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!hydratedRef.current) return
      flushMirror()
      if (saveStateRef.current === 'saving' && serializeContent(contentRef.current).length > MIRROR_LIMIT) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('pagehide', flushMirror)
    window.addEventListener('beforeunload', beforeUnload)
    return () => {
      window.removeEventListener('pagehide', flushMirror)
      window.removeEventListener('beforeunload', beforeUnload)
    }
  }, [])

  const setAdmin = useCallback((on: boolean) => {
    const verifiedOn = cloudMode
      ? Boolean(on && accountRef.current?.role === 'admin' && accountRef.current.status === 'approved')
      : on
    setAdminState(verifiedOn)
    if (verifiedOn) sessionStorage.setItem('ttf-admin-authed', '1')
    else sessionStorage.removeItem('ttf-admin-authed')
    window.dispatchEvent(new CustomEvent('ttf-admin', { detail: { on: verifiedOn } }))
  }, [cloudMode])

  const openGate = useCallback(() => setGateOpen(true), [])
  const closeGate = useCallback(() => setGateOpen(false), [])

  const setAt = useCallback((path: string, value: unknown) => {
    if (cloudMode && admin) cloudDraftDirtyRef.current = true
    setContent((prev) => {
      const next = clone(prev)
      setByPath(next as unknown as Record<string | number, unknown>, path, value)
      return next
    })
  }, [cloudMode, admin])

  const updateList = useCallback((path: string, items: unknown[]) => {
    if (cloudMode && admin) cloudDraftDirtyRef.current = true
    setContent((prev) => {
      const next = clone(prev)
      setByPath(next as unknown as Record<string | number, unknown>, path, items)
      return next
    })
  }, [cloudMode, admin])

  const exportJson = useCallback(() => JSON.stringify(content, null, 2), [content])

  const importJson = useCallback(async (json: string) => {
    if (cloudMode && !admin) return { ok: false, error: '只有管理员可以导入全站内容' }
    let imported = parseContent(json)
    if (!imported) return { ok: false, error: 'JSON 内容无效或格式不受支持，当前网站内容未更改' }
    const before = JSON.stringify(contentRef.current)
    if (cloudMode) {
      try {
        imported = await prepareSharedImages(imported, { origin: window.location.origin, upload: uploadCloudImage })
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : '图片迁移失败，原内容保持不变' }
      }
      if (JSON.stringify(contentRef.current) !== before) return { ok: false, error: '图片迁移期间网站内容发生变化，请核对后重新导入；当前内容未替换' }
    }
    const savedAt = Date.now()
    const serialized = serializeContent(imported, savedAt, cloudMode ? { updatedAt: cloudVersionRef.current } : undefined)
    setSaveState('saving')
    let durable = false
    if (idbSupported()) {
      try {
        await idbSet(CONTENT_KEY, serialized)
        durable = true
      } catch {
        // Fall through to localStorage as a recovery path.
      }
    }
    try {
      if (serialized.length <= MIRROR_LIMIT || !durable) {
        localStorage.setItem(CACHE_KEY, serialized)
        durable = true
      } else {
        localStorage.removeItem(CACHE_KEY)
      }
      localStorage.removeItem(LEGACY_KEY)
    } catch {
      // IndexedDB remains sufficient when the snapshot is larger than localStorage quota.
    }
    if (!durable) {
      setSaveState('error')
      return { ok: false, error: '网站内容未能写入本机存储；原有页面内容保持不变' }
    }

    contentRef.current = imported
    if (cloudMode && admin) cloudDraftDirtyRef.current = true
    setContent(imported)
    remoteContentRef.current = true
    setSaveState('saved')
    setLastSavedAt(savedAt)
    syncChannelRef.current?.postMessage({ type: 'content', content: JSON.stringify(imported) })
    return { ok: true }
  }, [cloudMode, admin])

  const reset = useCallback(() => {
    if (cloudMode && admin) cloudDraftDirtyRef.current = true
    setContent(clone(defaultContent))
  }, [cloudMode, admin])

  const initializeCloudContent = useCallback(async () => {
    if (!cloudMode) return { ok: false, error: '当前使用离线模式，未配置云端项目' }
    if (!admin) return { ok: false, error: '只有已验证的管理员可以初始化云端内容' }
    if (cloudSyncState !== 'uninitialized') return { ok: false, error: '云端内容已初始化或当前状态不允许覆盖' }
    try {
      const before = JSON.stringify(contentRef.current)
      const migrated = await prepareSharedImages(contentRef.current, { origin: window.location.origin, upload: uploadCloudImage })
      if (JSON.stringify(contentRef.current) !== before) throw new Error('上传图片期间内容发生变化，请核对后重新同步；云端尚未初始化')
      await initializeSharedContent(migrated)
      const shared = await loadSharedContentSnapshot<unknown>()
      if (!shared) throw new Error('云端初始化后未能读取版本，请重试同步')
      if (JSON.stringify(contentRef.current) === before) cloudDraftDirtyRef.current = false
      acceptCloudContent(shared.content, shared.updatedAt)
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : '初始化失败，请稍后重试' }
    }
  }, [cloudMode, admin, cloudSyncState, acceptCloudContent])

  const retryCloudSync = useCallback(async () => {
    if (!cloudMode) return
    setCloudSyncState('connecting')
    try {
      const shared = await loadSharedContentSnapshot<unknown>()
      acceptCloudContent(shared?.content, shared?.updatedAt ?? '')
    } catch {
      setCloudSyncState('error')
    }
  }, [cloudMode, acceptCloudContent])

  const restoreCloudContent = useCallback(async () => {
    if (!cloudMode || !admin) return { ok: false, error: '只有管理员可以处理本机草稿冲突' }
    try {
      await cloudSaveTailRef.current.catch(() => undefined)
      const shared = await loadSharedContentSnapshot<unknown>()
      if (!shared || !isCloudSiteContent(shared.content)) throw new Error('当前未能读取有效云端内容')
      if (compareCloudVersions(shared.updatedAt, cloudLatestVersionRef.current) < 0) throw new Error('读取期间云端再次更新，请重新加载')
      const draftJson = JSON.stringify(contentRef.current)
      const backup = serializeContent(contentRef.current)
      // Keep a durable, separate recovery copy before replacing anything.
      if (idbSupported()) await idbSet('ttf-cloud-conflict-backup', backup)
      else localStorage.setItem('ttf-cloud-conflict-backup', backup)
      if (JSON.stringify(contentRef.current) !== draftJson) throw new Error('备份期间草稿再次修改，请重新执行；内容未丢弃')
      const url = URL.createObjectURL(new Blob([JSON.stringify(contentRef.current, null, 2)], { type: 'application/json' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `tiantufu-draft-backup-${Date.now()}.json`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      cloudDraftDirtyRef.current = false
      acceptCloudContent(shared.content, shared.updatedAt)
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : '备份或读取失败；本机草稿未丢弃' }
    }
  }, [cloudMode, admin, acceptCloudContent])

  const completePasswordRecovery = useCallback(async (password: string) => {
    if (password.trim().length < 8) return { ok: false, error: '新密码至少 8 位' }
    try {
      await completeCloudPasswordRecovery(password)
      setPasswordRecoveryOpen(false)
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : '密码更新失败，请重新打开邮件链接' }
    }
  }, [])

  const refreshAccounts = useCallback(() => {
    if (cloudMode) {
      void (async () => {
        setAccountsReady(false)
        try {
          const user = await getCloudSessionUser()
          if (!user) {
            setAccounts([])
            setAccount(null)
            setAdminState(false)
            setAccountsReady(true)
            setAccountSaveState('saved')
            return
          }
          const selfProfile = await getCloudProfile(user.id)
          if (!selfProfile) throw new Error('未找到当前账号档案')
          const self = cloudAccount(selfProfile, user.email)
          const isAdmin = self.role === 'admin' && self.status === 'approved'
          const [profiles, applications] = await Promise.all([
            listCloudProfiles(),
            isAdmin ? listCloudMemberApplications() : Promise.resolve([] as CloudMemberApplication[]),
          ])
          const applicationById = new Map(applications.map((application) => [application.id, application]))
          const next = profiles.map((profile) => {
            const application = applicationById.get(profile.id)
            return {
              ...cloudAccount(profile, application?.email ?? (profile.id === self.id ? user.email : undefined)),
              note: application?.note,
            }
          })
          setAccounts(next)
          setAccount(next.find((item) => item.id === self.id) ?? self)
          setAdminState(isAdmin)
          setAccountsReady(true)
          setAccountSaveState('saved')
        } catch {
          setAccountsReady(true)
          setAccountSaveState('error')
        }
      })()
      return
    }
    const local = loadAccounts()
    void (async () => {
      let indexed: AccountRecord[] = []
      try {
        indexed = parseAccounts(idbSupported() ? await idbGet(ACCOUNTS_DB_KEY) : null)
      } catch {
        // localStorage remains the fallback.
      }
      const newest = (records: AccountRecord[]) => records.reduce((time, row) => Math.max(time, row.updatedAt || 0), 0)
      const next = indexed.length > 0 && (!local.length || newest(indexed) > newest(local)) ? indexed : local
      setAccounts(next)
      const id = currentAccountId()
      setAccount(id ? findAccountById(next, id) ?? null : null)
      setAccountsReady(true)
      if (next.length > 0) setAccountSaveState('saved')
    })()
  }, [cloudMode])

  /* ---------- 账号动作 ---------- */
  const loginAccount = useCallback(
    async (username: string, password: string, remember: boolean) => {
      if (!accountsReady || !hydrated) return { ok: false, error: '账号与网站资料仍在加载，请稍后重试' }
      if (cloudMode) {
        try {
          const result = await signInCloudAccount(username.trim(), password, remember)
          const profile = result.user ? await getCloudProfile(result.user.id) : null
          if (!profile) {
            await signOutCloudAccount().catch(() => undefined)
            clearSession()
            setAccount(null)
            setAccounts([])
            setAdminState(false)
            setAccountsReady(true)
            setAccountSaveState('saved')
            window.dispatchEvent(new CustomEvent('ttf-account', { detail: { account: null } }))
            return { ok: false, error: '账号档案尚未创建，请联系网站管理员检查 Supabase 配置' }
          }
          const acc = cloudAccount(profile, result.user?.email ?? username.trim())
          if (acc.status !== 'approved') {
            await signOutCloudAccount().catch(() => undefined)
            clearSession()
            setAccount(null)
            setAccounts([])
            setAdminState(false)
            setAccountsReady(true)
            setAccountSaveState('saved')
            window.dispatchEvent(new CustomEvent('ttf-account', { detail: { account: null } }))
            return {
              ok: false,
              error: acc.status === 'pending' ? '成员申请仍在等待管理员审核' : '该申请未通过审核，请联系管理员',
            }
          }
          setAccount(acc)
          const isAdmin = acc.role === 'admin' && acc.status === 'approved'
          setAdminState(isAdmin)
          window.dispatchEvent(new CustomEvent('ttf-account', { detail: { account: acc } }))
          refreshAccounts()
          if (acc.role === 'member') setGateOpen(false)
          return { ok: true, isAdmin, account: acc }
        } catch (error) {
          const message = error instanceof Error ? error.message : ''
          return {
            ok: false,
            error: /confirm|verified/i.test(message)
              ? '请先通过邮箱验证，再使用邮箱和密码登录'
              : '邮箱或密码不正确，请检查后重试',
          }
        }
      }
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
    [accountsReady, hydrated, cloudMode, refreshAccounts],
  )

  const registerAccount = useCallback(
    async (username: string, displayName: string, password: string, note?: string, email?: string) => {
      if (!accountsReady || !hydrated) return { ok: false, error: '账号与网站资料仍在加载，请稍后重试' }
      if (cloudMode) {
        const validationError = validateMemberRegistration(username, displayName, password, 8)
        if (validationError) return { ok: false, error: validationError }
        if (!email?.trim()) return { ok: false, error: '请填写用于登录和验证的邮箱地址' }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 254) {
          return { ok: false, error: '请填写有效的邮箱地址' }
        }
        if (accountRef.current) return { ok: false, error: '请先退出当前账号，再提交新的成员注册申请' }
        try {
          const result = await registerCloudMember({
            email: email.trim().toLowerCase(),
            password,
            username,
            displayName,
            note,
          })
          if (!result.user) return { ok: false, error: '申请未能提交，请检查邮箱后重试' }
          // Email confirmation may be disabled. A successful member signup can
          // then return a live session; immediately end it because the account
          // must remain pending until an administrator approves it.
          if (result.session) await signOutCloudAccount().catch(() => undefined)
          return { ok: true }
        } catch (error) {
          const message = error instanceof Error ? error.message : ''
          return { ok: false, error: /already|registered/i.test(message) ? '该邮箱已注册，请直接登录或联系管理员' : '注册失败，请检查邮箱格式后重试' }
        }
      }
      const result = await registerMemberAccount(accountsRef.current, username, displayName, password, note)
      if (!result.ok || !result.account) return { ok: false, error: result.error ?? '注册失败' }
      const persisted = await applyAccounts([...accountsRef.current, result.account])
      if (!persisted) return { ok: false, error: '申请没有写入本机存储，请检查浏览器空间后重试' }
      return { ok: true }
    },
    [accountsReady, hydrated, applyAccounts, cloudMode],
  )

  const logoutAccount = useCallback(() => {
    if (cloudMode) void signOutCloudAccount().catch(() => undefined)
    clearSession()
    setAccount(null)
    setAccounts([])
    setAccountsReady(true)
    setAdminState(false)
    window.dispatchEvent(new CustomEvent('ttf-account', { detail: { account: null } }))
  }, [cloudMode])

  /** 管理员审核通过：创建成员主页卡 + 作品集档案，并把账号绑定到该成员 */
  const approveAccount = useCallback(
    async (accountId: string, topic?: string) => {
      const acc = findAccountById(accountsRef.current, accountId)
      if (!acc) return { ok: false, error: '账号不存在' }
      if (acc.role !== 'member' || acc.status !== 'pending') {
        return { ok: false, error: '仅待审核的成员账号可以执行通过操作' }
      }
      const chosenTopic = topic && topic !== '' ? topic : acc.topic && acc.topic !== '' ? acc.topic : 'quan-jiakong'
      const card = makeApprovedMemberCard(acc, chosenTopic, fallbackAvatar(), fallbackWorkImage())
      const nextAccounts = accountsRef.current.map((a) =>
        a.id === acc.id
          ? { ...a, status: 'approved' as const, memberId: card.id, topic: chosenTopic, updatedAt: Date.now() }
          : a,
      )
      if (cloudMode) {
        try {
          // The server appends only this member/work to the latest cloud JSON.
          // Sending a stale full document here could overwrite another admin's
          // edits made on a different device while this approval form was open.
          const bundle = attachApprovedMember([], [], card, chosenTopic)
          const cloudContent = await approveCloudMember({
            userId: acc.id,
            memberId: card.id,
            topic: chosenTopic,
            member: bundle.members[0],
            work: bundle.worksArchive[0],
          })
          if (!isCloudSiteContent(cloudContent)) {
            throw new Error('成员已审批，但云端未返回有效站点内容；请刷新页面核对成员主页')
          }
          const latestContent = withArchiveDefaults(deepMerge(defaultContent, cloudContent))
          const shared = await loadSharedContentSnapshot<unknown>()
          if (!shared) throw new Error('审核已完成，但云端内容读取失败；请重试同步核对主页')
          acceptCloudContent(shared.content ?? latestContent, shared.updatedAt)
          setSaveState('saved')
          setLastSavedAt(Date.now())
          refreshAccounts()
          return { ok: true }
        } catch (error) {
          return { ok: false, error: error instanceof Error ? error.message : '云端审核失败，请检查连接后重试' }
        }
      }
      const nextContent = clone(contentRef.current)
      const attached = attachApprovedMember(nextContent.members, nextContent.worksArchive, card, chosenTopic)
      nextContent.members = attached.members
      nextContent.worksArchive = attached.worksArchive
      const persisted = await applyAccounts(nextAccounts, nextContent)
      if (!persisted) return { ok: false, error: '账号或主页未能完整保存到本机，请检查存储空间后重试' }
      return { ok: true }
    },
    [applyAccounts, cloudMode, refreshAccounts, acceptCloudContent],
  )

  const rejectAccount = useCallback(
    async (accountId: string) => {
      const target = findAccountById(accountsRef.current, accountId)
      if (!target || target.role !== 'member' || target.status !== 'pending') {
        return { ok: false, error: '仅待审核的成员账号可以执行拒绝操作' }
      }
      if (cloudMode) {
        try {
          await setCloudMemberStatus({ userId: target.id, status: 'rejected' })
          refreshAccounts()
          return { ok: true }
        } catch (error) {
          return { ok: false, error: error instanceof Error ? error.message : '云端拒绝操作失败' }
        }
      }
      const saved = await applyAccounts(
        accountsRef.current.map((a) =>
          a.id === accountId && a.role === 'member' && a.status === 'pending'
            ? { ...a, status: 'rejected' as const, updatedAt: Date.now() }
            : a,
        ),
      )
      return saved ? { ok: true } : { ok: false, error: '账号状态未能保存，请检查本机存储后重试' }
    },
    [applyAccounts, cloudMode, refreshAccounts],
  )

  const deleteAccount = useCallback(
    async (accountId: string) => {
      const target = findAccountById(accountsRef.current, accountId)
      if (!target || target.role === 'admin') return { ok: false, error: '找不到可删除的成员账号' }
      if (cloudMode) {
        try {
          await deleteCloudMemberAccount(accountId)
          refreshAccounts()
          return { ok: true }
        } catch (error) {
          return { ok: false, error: error instanceof Error ? error.message : '云端删除失败' }
        }
      }
      const saved = await applyAccounts(accountsRef.current.filter((a) => a.id !== accountId))
      if (!saved) return { ok: false, error: '账号未能删除并保存，请检查本机存储后重试' }
      const cur = accountRef.current
      if (cur && cur.id === accountId) {
        clearSession()
        setAccount(null)
        setAdminState(false)
      }
      return { ok: true }
    },
    [applyAccounts, cloudMode, refreshAccounts],
  )

  /** 成员/管理员本人资料同步：昵称、简介、公开头像与主题偏好。 */
  const accountUpdateMeta = useCallback(
    async (patch: Partial<Pick<AccountRecord, 'displayName' | 'bio' | 'topic' | 'avatar'>>) => {
      const cur = accountRef.current
      if (!cur) return { ok: false, error: '未登录' }
      const allowedPatch = filterEditableProfilePatch(cur.role, patch)
      const nextAccounts = accountsRef.current.map((a) =>
        a.id === cur.id ? { ...a, ...allowedPatch, updatedAt: Date.now() } : a,
      )
      let nextContent: SiteContent | undefined
      if (cur.memberId) {
        nextContent = clone(contentRef.current)
        const idx = nextContent.members.findIndex((m) => m.id === cur.memberId)
        if (idx >= 0) {
          if (typeof allowedPatch.displayName === 'string' && allowedPatch.displayName.trim()) {
            const oldName = nextContent.members[idx].name
            const uniqueName = nextContent.members.filter((member) => member.name === oldName).length === 1
            nextContent.members[idx].name = allowedPatch.displayName.trim()
            nextContent.worksArchive = nextContent.worksArchive.map((work) =>
              work.authorMemberId === cur.memberId || (!work.authorMemberId && uniqueName && work.author === oldName)
                ? { ...work, author: allowedPatch.displayName!.trim(), authorMemberId: cur.memberId } : work,
            )
          }
          if (typeof allowedPatch.bio === 'string') nextContent.members[idx].bio = allowedPatch.bio
          if (typeof allowedPatch.topic === 'string' && allowedPatch.topic) nextContent.members[idx].topic = allowedPatch.topic
          if (typeof allowedPatch.avatar === 'string') nextContent.members[idx].avatar = allowedPatch.avatar
        }
      }
      if (cloudMode) {
        try {
          const displayName = typeof allowedPatch.displayName === 'string' ? allowedPatch.displayName : cur.displayName
          const bio = typeof allowedPatch.bio === 'string' ? allowedPatch.bio : cur.bio ?? ''
          const avatar = typeof allowedPatch.avatar === 'string' ? allowedPatch.avatar : cur.avatar ?? ''
          if (cur.memberId) await updateCloudMemberProfile({ displayName, bio, avatar })
          else await updateMyCloudProfile({ display_name: displayName, bio, avatar })
          const updated = { ...cur, ...allowedPatch, updatedAt: Date.now() }
          setAccount(updated)
          setAccounts((previous) => previous.map((item) => (item.id === cur.id ? updated : item)))
          // The profile RPC merges into the current server document. Never
          // reinstall the pre-request full-site snapshot after it returns.
          const shared = await loadSharedContentSnapshot<unknown>()
          if (shared) acceptCloudContent(shared.content, shared.updatedAt)
          refreshAccounts()
          return { ok: true }
        } catch (error) {
          return { ok: false, error: error instanceof Error ? error.message : '云端资料保存失败' }
        }
      }
      const persisted = await applyAccounts(nextAccounts, nextContent)
      if (!persisted) return { ok: false, error: '资料未能完整保存到本机，请检查存储空间后重试' }
      return { ok: true }
    },
    [applyAccounts, cloudMode, refreshAccounts, acceptCloudContent],
  )

  const changeMyPassword = useCallback(
    async (oldPassword: string, newPassword: string) => {
      const cur = accountRef.current
      if (!cur) return { ok: false, error: '未登录' }
      if (newPassword.trim().length < (cloudMode ? 8 : 4)) return { ok: false, error: `新密码至少 ${cloudMode ? 8 : 4} 位` }
      if (cloudMode) {
        try {
          await changeCloudPassword(oldPassword, newPassword)
          return { ok: true }
        } catch (error) {
          return { ok: false, error: error instanceof Error ? error.message : '云端密码更新失败' }
        }
      }
      const ok = await verifyAccountPassword(cur, oldPassword)
      if (!ok) return { ok: false, error: '旧密码不正确' }
      const salt = `${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
      const passwordHash = await sha256(`${salt}:${newPassword}`)
      const persisted = await applyAccounts(
        accountsRef.current.map((a) => (a.id === cur.id ? { ...a, salt, passwordHash, updatedAt: Date.now() } : a)),
      )
      if (!persisted) return { ok: false, error: '密码未能保存，请检查本机存储后重试' }
      return { ok: true }
    },
    [applyAccounts, cloudMode],
  )

  const adminResetPassword = useCallback(
    async (accountId: string, newPassword: string) => {
      const target = findAccountById(accountsRef.current, accountId)
      if (!target) return { ok: false, error: '账号不存在' }
      if (cloudMode) {
        if (!target.email) return { ok: false, error: '未能取得该成员邮箱，请刷新列表后重试' }
        try {
          await sendCloudPasswordReset(target.email)
          return { ok: true }
        } catch (error) {
          return { ok: false, error: error instanceof Error ? error.message : '重置邮件发送失败' }
        }
      }
      if (newPassword.trim().length < 4) return { ok: false, error: '新密码至少 4 位' }
      const salt = `${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
      const passwordHash = await sha256(`${salt}:${newPassword}`)
      const persisted = await applyAccounts(
        accountsRef.current.map((a) => (a.id === accountId ? { ...a, salt, passwordHash, updatedAt: Date.now() } : a)),
      )
      if (!persisted) return { ok: false, error: '密码未能保存，请检查本机存储后重试' }
      return { ok: true }
    },
    [applyAccounts, cloudMode],
  )

  const accountExport = useCallback(() => {
    if (cloudMode) return ''
    return exportMemberAccountMetadata(accounts)
  }, [accounts, cloudMode])

  const accountImport = useCallback(
    async (json: string) => {
      if (cloudMode) return { ok: false, error: '云端账号由 Supabase 管理，不支持导入本地账号元数据' }
      const availableMemberIds = new Set(contentRef.current.members.map((member) => member.id))
      const plan = mergeMemberAccountMetadata(accountsRef.current, json, availableMemberIds)
      if (!plan.ok || !plan.accounts) return { ok: false, error: plan.error ?? '账号导入失败' }
      const saved = await applyAccounts(plan.accounts)
      return saved ? { ok: true } : { ok: false, error: '账号未能保存到本机，请检查存储空间后重试' }
    },
    [applyAccounts, cloudMode],
  )

  const saveError = saveState === 'error'
  const clearSaveError = useCallback(() => setSaveState('idle'), [])

  const value = useMemo<ContentContextValue>(
    () => ({
      content,
      admin,
      gateOpen,
      hydrated,
      accountsReady,
      saveState,
      accountSaveState,
      cloudMode,
      cloudSyncState,
      initializeCloudContent,
      retryCloudSync,
      restoreCloudContent,
      passwordRecoveryOpen,
      completePasswordRecovery,
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
      accountsReady,
      saveState,
      accountSaveState,
      cloudMode,
      cloudSyncState,
      initializeCloudContent,
      retryCloudSync,
      restoreCloudContent,
      passwordRecoveryOpen,
      completePasswordRecovery,
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
