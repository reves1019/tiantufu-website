const DB_NAME = 'ttf-uploads'
const DB_STORE = 'dir-handle'
const MAX_FALLBACK_BYTES = 1024 * 1024 // 1MB

export interface UploadResult {
  /** 写入内容的引用：/uploads/xxx.png 或 data:image/... */
  ref: string
  mode: 'file' | 'dataurl'
  dirName?: string
}

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
    const handle = await picker.call(window, { mode: 'readwrite' })
    await saveDirectoryHandle(handle)
    return handle.name
  } catch {
    return null
  }
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
 * 3. 都不行 → 1MB 以内转 Base64，超出报错提示改用目录模式。
 */
export async function uploadImage(file: File): Promise<UploadResult> {
  const fileName = `${Date.now()}-${safeFileName(file.name)}`

  const saved = await getSavedDirectoryHandle()
  if (saved) {
    try {
      await writeToUploads(saved, fileName, file)
      return { ref: `/uploads/${fileName}`, mode: 'file', dirName: saved.name }
    } catch {
      // 写入失败（目录可能已失效），继续尝试选择新目录或回退
    }
  }

  if (typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker === 'function') {
    try {
      const picker = (window as unknown as {
        showDirectoryPicker: (options?: { mode?: string }) => Promise<FileSystemDirectoryHandle>
      }).showDirectoryPicker
      const dir = await picker.call(window, { mode: 'readwrite' })
      await saveDirectoryHandle(dir)
      await writeToUploads(dir, fileName, file)
      return { ref: `/uploads/${fileName}`, mode: 'file', dirName: dir.name }
    } catch {
      // 用户取消或权限失败 → 回退 Base64
    }
  }

  if (file.size > MAX_FALLBACK_BYTES) {
    throw new Error('图片超过 1MB：请先点击“选择上传目录”写入网站文件夹，或压缩图片后重试')
  }
  const dataUrl = await readAsDataURL(file)
  return { ref: dataUrl, mode: 'dataurl' }
}
