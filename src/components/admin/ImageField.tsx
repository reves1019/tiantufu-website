import { useEffect, useId, useRef, useState } from 'react'
import { chooseUploadDirectory, uploadImage } from '../../lib/imageUpload'
import { getCloudUserId, uploadCloudImage } from '../../lib/supabase'
import { useContent } from '../../lib/contentStore'

interface ImageFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
}

/** 图片字段：预览 + 路径/链接输入 + 本地目录落盘；不支持时回退至本机 Base64。 */
export default function ImageField({ label, value, onChange }: ImageFieldProps) {
  const { cloudMode, account } = useContent()
  const fileRef = useRef<HTMLInputElement>(null)
  const fieldId = useId()
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [previewError, setPreviewError] = useState(false)
  const inFlight = useRef(false)
  const mounted = useRef(true)
  const latest = useRef({ value, onChange, accountId: account?.id })
  latest.current = { value, onChange, accountId: account?.id }

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  useEffect(() => setPreviewError(false), [value])

  const handleFile = async (file: File | undefined) => {
    if (!file || inFlight.current) return
    inFlight.current = true
    const original = { value, accountId: account?.id }
    const applyUpload = (ref: string) => {
      if (!mounted.current) return false
      if (latest.current.value !== original.value || latest.current.accountId !== original.accountId) {
        throw new Error('上传期间内容或登录账号发生变化，未替换当前图片。请检查最新内容后重新上传。')
      }
      latest.current.onChange(ref)
      return true
    }
    setBusy(true)
    setError('')
    setStatus('')
    try {
      if (file.size === 0) throw new Error('图片文件为空，请重新选择一张有效图片。')
      if (cloudMode) {
        const extensions: Record<string, string> = {
          'image/jpeg': 'jpg',
          'image/png': 'png',
          'image/webp': 'webp',
          'image/gif': 'gif',
          'image/avif': 'avif',
        }
        const extension = extensions[file.type]
        if (!extension) throw new Error('仅支持 JPEG、PNG、WebP、GIF 或 AVIF 图片')
        if (file.size > 10 * 1024 * 1024) throw new Error('图片不能超过 10 MiB')
        const filename = `${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}.${extension}`
        const path = account?.role === 'member' ? `avatars/${await getCloudUserId()}/${filename}` : `site/${filename}`
        const url = await uploadCloudImage(file, path)
        if (!applyUpload(url)) return
        setStatus('图片已上传到共享素材库，保存后会同步到所有设备。')
        return
      }
      const result = await uploadImage(file)
      if (!applyUpload(result.ref)) return
      setStatus(
        result.mode === 'file'
          ? `已写入 ${result.dirName ?? '所选静态资源目录'}/uploads/。本机预览可直接读取；线上静态站不会自动收到本地文件，需重新构建并部署。`
          : file.size >= 3 * 1024 * 1024
            ? `图片已存入本机内容库（${(file.size / 1024 / 1024).toFixed(1)} MB）。建议使用网站目录上传，避免 JSON 备份过大。`
            : '图片已存入本机浏览器内容库；当前静态站点不会自动把文件上传到线上。',
      )
    } catch (err) {
      if (mounted.current) setError(err instanceof Error ? err.message : '上传失败，请重试')
    } finally {
      inFlight.current = false
      if (mounted.current) setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handlePickDir = async () => {
    if (cloudMode || inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setError('')
    setStatus('')
    try {
      const name = await chooseUploadDirectory()
      if (name) setStatus(`已选择上传目录：${name}（之后上传的图片会写入其 uploads/ 子目录）`)
      else setStatus('未选择目录：将使用 Base64 小图回退模式')
    } catch (err) {
      setError(err instanceof Error ? err.message : '无法访问上传目录，请检查浏览器权限后重试。')
    } finally {
      inFlight.current = false
      if (mounted.current) setBusy(false)
    }
  }

  const showPreview = /^(data:image\/|https?:\/\/)/i.test(value) || !/^[a-z][a-z\d+.-]*:/i.test(value)

  return (
    <div className="rounded-lg border border-white/10 bg-ink-950/70 p-3">
      <div className="flex items-start gap-3">
        <div className="h-16 w-24 shrink-0 overflow-hidden rounded-md border border-white/10 bg-ink-900">
          {showPreview && value && !previewError ? (
            <img src={value} alt={`${label}预览`} onError={() => setPreviewError(true)} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center font-mono text-[9px] text-parchment-500">
              {previewError ? '图片无法读取' : '无预览'}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <label htmlFor={fieldId} className="block font-mono text-[11px] tracking-[0.12em] text-parchment-300">{label}</label>
          <input
            id={fieldId}
            disabled={busy}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="/uploads/xxx.png 或 https://… 或 data:image/…"
            className="mt-1 w-full rounded border border-white/10 bg-ink-950 px-2 py-1.5 text-xs text-parchment-100 outline-none transition-colors focus:border-brand-500"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="rounded border border-brand-500/50 bg-brand-500/10 px-3 py-1 text-[11px] tracking-[0.15em] text-brand-400 transition-colors hover:bg-brand-500/20 disabled:opacity-50"
            >
              选择图片上传
            </button>
            {!cloudMode && <button
              type="button"
              disabled={busy}
              onClick={handlePickDir}
              className="rounded border border-white/15 px-3 py-1 text-[11px] tracking-[0.15em] text-parchment-300 transition-colors hover:border-brand-500/50 hover:text-brand-400 disabled:opacity-50"
            >
              选择上传目录
            </button>}
            {value && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onChange('')}
                className="rounded border border-white/10 px-3 py-1 text-[11px] tracking-[0.15em] text-parchment-500 transition-colors hover:border-brand-500/50 hover:text-brand-400 disabled:opacity-50"
              >
                清除
              </button>
            )}
            {busy && <span className="font-mono text-[10px] text-parchment-400">处理中…</span>}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-parchment-500">
            {cloudMode
              ? '图片将上传到 Supabase 共享素材库；成员只能上传自己的头像，管理员可管理全站图片。单张上限 10 MiB。'
              : 'Vite 项目可选择项目根目录（会自动写入 public/uploads）；离线包请选择 index.html 所在目录。若不选目录，小于 10 MB 的图片会保存到此浏览器；线上发布需重新部署。'}
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/bmp"
            className="hidden"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
          {status && <p role="status" className="mt-1.5 text-xs leading-relaxed text-gold-300">{status}</p>}
          {error && <p role="alert" className="mt-1.5 text-xs leading-relaxed text-brand-400">{error}</p>}
        </div>
      </div>
    </div>
  )
}
