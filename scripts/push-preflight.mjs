import { readFile, access } from 'node:fs/promises'
import { constants } from 'node:fs'
import { resolve } from 'node:path'

const cloudRequired = process.argv.includes('--require-cloud')
const readEnv = async (file) => {
  const text = await readFile(resolve(file), 'utf8').catch(() => '')
  return Object.fromEntries(text.split(/\r?\n/).flatMap((line) => {
    const item = line.trim()
    if (!item || item.startsWith('#')) return []
    const index = item.indexOf('=')
    return index > 0 ? [[item.slice(0, index), item.slice(index + 1).replace(/^['"]|['"]$/g, '')]] : []
  }))
}
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1 }
const pass = (message) => console.log(`OK: ${message}`)
const required = async (file, label) => {
  try { await access(resolve(file), constants.R_OK); pass(label); return true }
  catch { fail(`${label} is missing`); return false }
}
const publicEnv = await readEnv('.env.local')
const serverEnv = await readEnv('.secrets/push-server.env')
const generatedPublicEnv = await readEnv('.secrets/push-public.env')
const publicKey = publicEnv.VITE_WEB_PUSH_PUBLIC_KEY
const generatedPublicKey = generatedPublicEnv.VITE_WEB_PUSH_PUBLIC_KEY
const serverPublicKey = serverEnv.WEB_PUSH_PUBLIC_KEY
const decode = (value) => Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4), 'base64')

await required('supabase/functions/push-dispatch/index.ts', 'Push dispatch function source')
await required('supabase/push_schedule.template.sql', 'Push scheduler template')
await required('public/sw.js', 'Browser service worker')
if (!publicKey) fail('VITE_WEB_PUSH_PUBLIC_KEY is missing from .env.local; run `pnpm push:local`')
else if (decode(publicKey).length !== 65 || decode(publicKey)[0] !== 4) fail('VITE_WEB_PUSH_PUBLIC_KEY is not a P-256 VAPID public key')
else pass('Browser VAPID public key has the expected P-256 format')
if (!generatedPublicKey) fail('Generated browser public-key file is incomplete; run `pnpm push:keys`')
else if (publicKey && generatedPublicKey !== publicKey) fail('The generated browser public key and .env.local do not match')
else pass('Generated browser public key agrees with .env.local')
if (!serverPublicKey || !serverEnv.WEB_PUSH_PRIVATE_KEY || !serverEnv.PUSH_DISPATCH_SECRET || !serverEnv.WEB_PUSH_SUBJECT) {
  fail('Local server push key set is incomplete; run `pnpm push:keys`')
} else if (serverEnv.PUSH_DISPATCH_SECRET.length < 32) {
  fail('PUSH_DISPATCH_SECRET is too short')
} else if (publicKey && serverPublicKey !== publicKey) {
  fail('Browser and server VAPID public keys do not match')
} else pass('Local server key set is complete and matches the browser public key')
const privateNames = ['VITE_WEB_PUSH_PRIVATE_KEY', 'VITE_PUSH_DISPATCH_SECRET', 'VITE_SUPABASE_SERVICE_ROLE_KEY']
for (const name of privateNames) {
  if (name in publicEnv) fail(`${name} must never be placed in .env.local`)
}
const cloudBrowserEnv = { ...publicEnv, ...process.env }
if (!cloudBrowserEnv.VITE_SUPABASE_URL || !(cloudBrowserEnv.VITE_SUPABASE_PUBLISHABLE_KEY || cloudBrowserEnv.VITE_SUPABASE_ANON_KEY)) {
  const message = 'Cloud browser variables are not loaded in this shell; subscriptions remain unavailable until production configuration is supplied.'
  if (cloudRequired) fail(message); else console.warn(`WARN: ${message}`)
} else pass('Cloud browser variables are available to the preflight process')
if (!process.exitCode) console.log('Push preflight completed without exposing any secret values.')
