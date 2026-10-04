const DB_NAME = 'ttf-uploads'
const DB_STORE = 'dir-handle'
export interface UploadResult {
  /** 写入内容的引用：/uploads/xxx.png 或 data:image/... */
  ref: string
  mode: 'file' | 'dataurl'
  dirName?: string
}

const MAX_INLINE_IMAGE_BYTES = 10 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/bmp'])

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(DB_STORE)) {
        request.result.createObjectStore(DB_STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite')
    tx.objectStore(DB_STORE).put(handle, 'site-root')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getSavedDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readonly')
      const req = tx.objectStore(DB_STORE).get('site-root')
      req.onsuccess = () => resolve((req.result as FileSystemDirectoryHandle | undefined) ?? null)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

/** 选择网站根文件夹（含 index.html），保存句柄供后续直接上传 */
export async function chooseUploadDirectory(): Promise<string | null> {
  if (typeof (window as unknown as { showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker !== 'function') {
    return null
  }
  try {
    const picker = (window as unknown as {
      showDirectoryPicker: (options?: { mode?: string }) => Promise<FileSystemDirectoryHandle>
    }).showDirectoryPicker
    const selected = await picker.call(window, { mode: 'readwrite' })
    const target = await resolveServedAssetsDirectory(selected)
    await saveDirectoryHandle(target.handle)
    return target.label
  } catch {
    return null
  }
}

async function hasFile(directory: FileSystemDirectoryHandle, name: string): Promise<boolean> {
  try {
    await directory.getFileHandle(name)
    return true
  } catch {
    return false
  }
}

async function hasDirectory(directory: FileSystemDirectoryHandle, name: string): Promise<boolean> {
  try {
    await directory.getDirectoryHandle(name)
    return true
  } catch {
    return false
  }
}

/** Vite 项目根目录里的静态文件必须放在 public/ 才能进入预览与构建产物。 */
async function resolveServedAssetsDirectory(selected: FileSystemDirectoryHandle) {
  const looksLikeViteRoot =
    (await hasFile(selected, 'vite.config.ts')) ||
    (await hasFile(selected, 'vite.config.js')) ||
    (await hasFile(selected, 'vite.config.mts'))
  if (looksLikeViteRoot && (await hasDirectory(selected, 'public'))) {
    const publicDirectory = await selected.getDirectoryHandle('public')
    return { handle: publicDirectory, label: `${selected.name}/public` }
  }
  return { handle: selected, label: selected.name }
}

async function writeToUploads(dir: FileSystemDirectoryHandle, fileName: string, file: File): Promise<void> {
  const uploads = await dir.getDirectoryHandle('uploads', { create: true })
  const fileHandle = await uploads.getFileHandle(fileName, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(file)
  await writable.close()
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('读取图片失败'))
    reader.readAsDataURL(file)
  })
}

function safeFileName(name: string): string {
  const clean = name.replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '')
  return clean || 'image'
}

/**
 * 上传图片：
 * 1. 已有目录句柄 → 写入该目录 uploads/，返回 /uploads/文件名；
 * 2. 无句柄但浏览器支持目录选择 → 弹出选择（用户可取消，随后回退）；
 * 3. 都不行 → 转 Base64 存入本机 IndexedDB；该方式不会把图片上传到线上服务器。
 */
export async function uploadImage(file: File): Promise<UploadResult> {
  if (file.size === 0) throw new Error('图片文件为空，请重新选择一张有效图片。')
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error('请选择 PNG、JPG、WebP、GIF、AVIF 或 BMP 图片。')
  }
  const random = globalThis.crypto?.randomUUID?.().slice(0, 8) ?? Math.random().toString(36).slice(2, 10)
  const fileName = `${Date.now()}-${random}-${safeFileName(file.name)}`

  const saved = await getSavedDirectoryHandle()
  if (saved) {
    try {
      const target = await resolveServedAssetsDirectory(saved)
      await writeToUploads(target.handle, fileName, file)
      if (target.handle !== saved) await saveDirectoryHandle(target.handle)
      return { ref: `/uploads/${fileName}`, mode: 'file', dirName: target.label }
    } catch {
      // 写入失败（目录可能已失效），继续尝试选择新目录或回退
    }
  }

  if (typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker === 'function') {
    try {
      const picker = (window as unknown as {
        showDirectoryPicker: (options?: { mode?: string }) => Promise<FileSystemDirectoryHandle>
      }).showDirectoryPicker
      const selected = await picker.call(window, { mode: 'readwrite' })
      const target = await resolveServedAssetsDirectory(selected)
      await saveDirectoryHandle(target.handle)
      await writeToUploads(target.handle, fileName, file)
      return { ref: `/uploads/${fileName}`, mode: 'file', dirName: target.label }
    } catch {
      // 用户取消或权限失败 → 回退 Base64
    }
  }

  if (file.size > MAX_INLINE_IMAGE_BYTES) {
    throw new Error('图片超过 10 MB，且当前没有可写入的静态资源目录。请先选择项目 public 文件夹或离线网站目录再上传。')
  }
  const dataUrl = await readAsDataURL(file)
  return { ref: dataUrl, mode: 'dataurl' }
}
