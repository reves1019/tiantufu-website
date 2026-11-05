import { createECDH, randomBytes } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
const dir=resolve('.secrets')
await mkdir(dir,{recursive:true})
const key=createECDH('prime256v1');key.generateKeys()
const publicKey=key.getPublicKey().toString('base64url')
// wx refuses to rotate/overwrite a key already in use by subscribed browsers.
await writeFile(resolve(dir,'push-server.env'),[
  `WEB_PUSH_PUBLIC_KEY=${publicKey}`,
  `WEB_PUSH_PRIVATE_KEY=${key.getPrivateKey().toString('base64url')}`,
  `PUSH_DISPATCH_SECRET=${randomBytes(32).toString('hex')}`,
  'WEB_PUSH_SUBJECT=https://tiantufu.com',
  '',
].join('\n'),{flag:'wx',mode:0o600})
await writeFile(resolve(dir,'push-public.env'),`VITE_WEB_PUSH_PUBLIC_KEY=${publicKey}\n`,{flag:'wx',mode:0o600})
console.log('Generated .secrets/push-server.env (server only) and .secrets/push-public.env (frontend public key). No key values were logged. Keep the existing pair for future deployments.')
