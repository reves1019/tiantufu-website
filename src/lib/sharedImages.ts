/** Only visual content fields are migrated. Links, copy and UI labels are not. */
export function collectImageReferences(value: unknown): Array<{ path: string; ref: string }> {
  const entries: Array<{ path: string; ref: string }> = []
  const visit = (node: unknown, parts: string[]) => {
    if (typeof node === 'string') {
      const field = parts.at(-1)
      const media = parts[0] === 'media' && (parts[1] === 'brand' || parts[1] === 'maps')
      const visual = ['members', 'worksArchive', 'contest', 'homeAtlas', 'earth', 'topics'].includes(parts[0]) &&
        ['image', 'fullImage', 'avatar', 'roof', 'cover'].includes(field ?? '')
      if ((media || visual) && node.trim()) entries.push({ path: parts.join('.'), ref: node })
    } else if (Array.isArray(node)) {
      node.forEach((entry, index) => visit(entry, [...parts, String(index)]))
    } else if (node && typeof node === 'object') {
      Object.entries(node).forEach(([key, entry]) => visit(entry, [...parts, key]))
    }
  }
  visit(value, [])
  return entries
}

/** Returns a new document; an interrupted migration never edits the source. */
export async function prepareSharedImages<T>(content: T, options: {
  origin: string
  upload: (file: File, path: string) => Promise<string>
  fetchImage?: typeof fetch
}): Promise<T> {
  const next = structuredClone(content)
  const migrated = new Map<string, string>()
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
    'image/gif': 'gif', 'image/avif': 'avif',
  }
  for (const entry of collectImageReferences(next)) {
    const resolved = new URL(entry.ref, options.origin)
    // Already-shared HTTPS images stay untouched. Never fetch third-party
    // private links or copy an unrelated site's files into our public bucket.
    if (resolved.origin !== options.origin && !['data:', 'blob:'].includes(resolved.protocol)) {
      if (resolved.protocol !== 'https:') throw new Error(`图片 ${entry.path} 不是可共享的 HTTPS 地址，请先上传图片`)
      continue
    }
    let publicUrl = migrated.get(resolved.href)
    if (!publicUrl) {
      try {
        const response = await (options.fetchImage ?? fetch)(resolved.href)
        if (!response.ok) throw new Error(`图片读取失败（${response.status}）`)
        const blob = await response.blob()
        const type = blob.type.split(';')[0].trim().toLowerCase()
        const extension = extensions[type]
        if (!extension) throw new Error('请使用 PNG、JPEG、WebP、GIF 或 AVIF 图片')
        if (!blob.size || blob.size > 10 * 1024 * 1024) throw new Error('图片为空或超过 10 MiB')
        const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
        const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
        const filename = `${hash}.${extension}`
        publicUrl = await options.upload(new File([blob], filename, { type }), `site/migrated/${filename}`)
        migrated.set(resolved.href, publicUrl)
      } catch (error) {
        throw new Error(`图片 ${entry.path} 迁移失败：${error instanceof Error ? error.message : '请检查素材和网络'}；原有网站内容未替换`)
      }
    }
    const parts = entry.path.split('.')
    let target = next as Record<string, unknown>
    for (const part of parts.slice(0, -1)) target = target[part] as Record<string, unknown>
    target[parts.at(-1)!] = publicUrl
  }
  return next
}
