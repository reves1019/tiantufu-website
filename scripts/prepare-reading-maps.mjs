import { createRequire } from 'node:module'
import { mkdir, access } from 'node:fs/promises'
import path from 'node:path'
const sharp = createRequire(process.env.TTF_SHARP_PACKAGE)('sharp')
const source = process.argv[2]
if (!source) throw new Error('Provide the user-owned source folder.')
const files = [
  ['笙茗Reves的近东1045.png', 'near-east-1045.webp'],
  ['圣雄肝帝西班牙球作品：烈焰升腾：美利坚.jpg', 'america.webp'],
  ['子虚的白菜作品南唐.jpg', 'nantang.webp'],
]
await mkdir('public/collection', { recursive: true })
for (const [original, name] of files) {
  const destination = path.join('public/collection', name)
  try { await access(destination); console.log(`Preserved existing ${name}`); continue } catch {}
  const image = sharp(path.join(source, original))
  const metadata = await image.metadata()
  const result = await image.rotate().resize({ width: 6000, height: 6000, fit: 'inside', withoutEnlargement: true }).webp({ quality: 88, effort: 6 }).toFile(destination)
  console.log(`${name}: ${metadata.width}×${metadata.height} → ${result.width}×${result.height}, ${result.size} bytes`)
}
