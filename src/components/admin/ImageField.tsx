import { useRef, useState } from 'react'
import { chooseUploadDirectory, uploadImage } from '../../lib/imageUpload'

interface ImageFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
}

/** 图片字段：预览 + 路径/链接输入 + 上传（优先写入网站 uploads/，回退 Base64） */
export default function ImageField({ label, value, onChange }: ImageFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setError('')
    setStatus('')
    try {
      const result = await uploadImage(file)
      onChange(result.ref)
      setStatus(
        result.mode === 'file'
          ? `已写入网站 uploads/ 目录（${result.dirName ?? ''}）`
          : '已转 Base64 存入内容（小图回退模式）',
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败，请重试')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handlePickDir = async () => {
    setBusy(true)
    setError('')
    try {
      const name = await chooseUploadDirectory()
      if (name) setStatus(`已选择上传目录：${name}（之后上传的图片会写入其 uploads/ 子目录）`)
      else setStatus('未选择目录：将使用 Base64 小图回退模式')
    } finally {
      setBusy(false)
    }
  }

  const showPreview = value.startsWith('data:') || value.startsWith('http') || value.startsWith('/')

  return (
    <div className="rounded-lg border border-white/10 bg-ink-950/70 p-3">
      <div className="flex items-start gap-3">
        <div className="h-16 w-24 shrink-0 overflow-hidden rounded-md border border-white/10 bg-ink-900">
          {showPreview && value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center font-mono text-[9px] text-parchment-500">
              无预览
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <label className="block font-mono text-[9px] tracking-[0.25em] text-parchment-500">{label}</label>
          <input
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
            <button
              type="button"
              disabled={busy}
              onClick={handlePickDir}
              className="rounded border border-white/15 px-3 py-1 text-[11px] tracking-[0.15em] text-parchment-300 transition-colors hover:border-brand-500/50 hover:text-brand-400 disabled:opacity-50"
            >
              选择上传目录
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="rounded border border-white/10 px-3 py-1 text-[11px] tracking-[0.15em] text-parchment-500 transition-colors hover:border-brand-500/50 hover:text-brand-400"
              >
                清除
              </button>
            )}
            {busy && <span className="font-mono text-[10px] text-parchment-400">处理中…</span>}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
          {status && <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-gold-400">{status}</p>}
          {error && <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-brand-400">{error}</p>}
        </div>
      </div>
    </div>
  )
}
