import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const source = resolve('.secrets/push-public.env')
const target = resolve('.env.local')
const raw = await readFile(source, 'utf8').catch(() => {
  throw new Error('Push keys are missing. Run `pnpm push:keys` first.')
})
const match = raw.match(/^VITE_WEB_PUSH_PUBLIC_KEY=([^\r\n]+)$/m)
if (!match?.[1]) throw new Error('The local push public-key file is malformed.')
const existing = await readFile(target, 'utf8').catch(() => '')
const line = `VITE_WEB_PUSH_PUBLIC_KEY=${match[1]}`
const next = /^VITE_WEB_PUSH_PUBLIC_KEY=.*$/m.test(existing)
  ? existing.replace(/^VITE_WEB_PUSH_PUBLIC_KEY=.*$/m, line)
  : `${existing.trimEnd()}${existing.trim() ? '\n' : ''}${line}\n`
await writeFile(target, next, { mode: 0o600 })
console.log('Configured the local browser VAPID public key in .env.local. No key value was printed.')
