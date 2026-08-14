import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
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
import { isAuthed } from './authStore'

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

// v3：正式站规格内容扩充（新闻详情/成员标签/赛事作品/约稿价格表等），升级键避免旧缓存覆盖新默认内容
const STORAGE_KEY = 'ttf-admin-content-v3'

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
        baseValue !== undefined && typeof baseValue === 'object' && baseValue !== null && typeof patchValue === 'object' && patchValue !== null
          ? deepMerge(baseValue, patchValue)
          : patchValue
    }
    return out as T
  }
  return patch as T
}

function loadSaved(): SiteContent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return deepMerge(defaultContent, JSON.parse(raw) as unknown)
  } catch {
    return null
  }
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

interface ContentContextValue {
  content: SiteContent
  admin: boolean
  gateOpen: boolean
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
}

const ContentContext = createContext<ContentContextValue | null>(null)

export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<SiteContent>(() => loadSaved() ?? defaultContent)
  const [admin, setAdminState] = useState(() => isAuthed())
  const [gateOpen, setGateOpen] = useState(false)
  const [saveError, setSaveError] = useState(false)

  // 自动保存（管理员修改即时写入 localStorage）
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(content))
      setSaveError(false)
    } catch {
      // 存储不可用/超配额：提示管理员导出 JSON 或改用文件夹模式，避免静默丢失
      setSaveError(true)
    }
  }, [content])

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
      setContent(deepMerge(defaultContent, JSON.parse(json) as unknown))
      return true
    } catch {
      return false
    }
  }, [])

  const reset = useCallback(() => setContent(clone(defaultContent)), [])

  const clearSaveError = useCallback(() => setSaveError(false), [])

  const value = useMemo<ContentContextValue>(
    () => ({
      content,
      admin,
      gateOpen,
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
    }),
    [content, admin, gateOpen, setAdmin, openGate, closeGate, setAt, updateList, exportJson, importJson, saveError, clearSaveError, reset],
  )

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>
}

export function useContent() {
  const ctx = useContext(ContentContext)
  if (!ctx) throw new Error('useContent 必须在 ContentProvider 内使用')
  return ctx
}
