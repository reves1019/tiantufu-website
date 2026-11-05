import { spawn, spawnSync } from 'node:child_process'
import { access } from 'node:fs/promises'
import { constants } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const viteBin = resolve(root, 'node_modules/vite/bin/vite.js')
const playwrightPackage = resolve(root, 'node_modules/playwright/package.json')
const pglitePackage = resolve(root, 'node_modules/@electric-sql/pglite/package.json')
const edge = process.env.TTF_BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
for (const file of [viteBin, playwrightPackage, pglitePackage, edge]) {
  try { await access(file, constants.R_OK) } catch { throw new Error(`Missing test dependency: ${file}. Run \`pnpm install\` or set TTF_BROWSER_PATH.`) }
}
const port = 4173
const cloudPort = 5176
const env = {
  ...process.env,
  TTF_PLAYWRIGHT_PACKAGE_JSON: playwrightPackage,
  TTF_PGLITE_PACKAGE_JSON: pglitePackage,
  TTF_BROWSER_PATH: edge,
  TTF_TEST_URL: `http://127.0.0.1:${port}/`,
  TTF_CLOUD_TEST_URL: `http://127.0.0.1:${cloudPort}/`,
}
const vite = spawn(process.execPath, [viteBin, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, env, stdio: 'pipe' })
const cloudVite = spawn(process.execPath, [viteBin, '--host', '127.0.0.1', '--port', String(cloudPort), '--strictPort'], {
  cwd: root,
  env: {
    ...env,
    VITE_SUPABASE_URL: 'https://registration-test.supabase.co',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_isolated_browser_fixture',
  },
  stdio: 'pipe',
})
const stop = () => {
  for (const process of [vite, cloudVite]) if (!process.killed) process.kill()
}
process.on('exit', stop)
process.on('SIGINT', () => { stop(); process.exit(130) })
const waitForSite = async (url) => {
  for (let attempt = 0; attempt < 50; attempt++) {
    try { const response = await fetch(url); if (response.ok) return } catch { /* wait for Vite */ }
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  throw new Error(`Timed out starting ${url}`)
}
const typedRegressionFiles = new Set([
  'tests/accounts.regression.mjs', 'tests/cloud-version.regression.mjs', 'tests/shared-images.regression.mjs',
  'tests/ui-text-fields.regression.mjs', 'tests/map-motion.regression.mjs', 'tests/map-viewport.regression.mjs',
  'tests/palace.regression.mjs', 'tests/photo-shelf.regression.mjs', 'tests/shelf-camera.regression.mjs',
  'tests/interaction-learning.regression.mjs',
  'tests/design-motion.regression.mjs',
])
const run = (label, file, extraEnv = {}) => {
  console.log(`\n▶ ${label}`)
  const nodeArgs = typedRegressionFiles.has(file) ? ['--experimental-strip-types', file] : [file]
  const result = spawnSync(process.execPath, nodeArgs, { cwd: root, env: { ...env, ...extraEnv }, stdio: 'inherit' })
  if (result.status !== 0) throw new Error(`${label} failed`)
}
try {
  await Promise.all([waitForSite(env.TTF_TEST_URL), waitForSite(env.TTF_CLOUD_TEST_URL)])
  for (const [label, file] of [
    ['Account regression', 'tests/accounts.regression.mjs'], ['Cloud security regression', 'tests/cloud-security.regression.mjs'],
    ['Interaction learning model regression', 'tests/interaction-learning.regression.mjs'],
    ['Design motion model regression', 'tests/design-motion.regression.mjs'],
    ['Cloud version regression', 'tests/cloud-version.regression.mjs'], ['Shared image regression', 'tests/shared-images.regression.mjs'],
    ['UI text regression', 'tests/ui-text-fields.regression.mjs'], ['Map motion regression', 'tests/map-motion.regression.mjs'],
    ['Map viewport regression', 'tests/map-viewport.regression.mjs'], ['Palace regression', 'tests/palace.regression.mjs'],
    ['Photo shelf regression', 'tests/photo-shelf.regression.mjs'], ['Shelf camera regression', 'tests/shelf-camera.regression.mjs'],
    ['Push dispatcher regression', 'tests/push-dispatch.regression.mjs'], ['Community database regression', 'tests/community-db.regression.mjs'],
    ['Author post database regression', 'tests/author-posts-db.regression.mjs'], ['Email registration database regression', 'tests/email-registration-db.regression.mjs'],
    ['Site layout browser regression', 'tests/site-layout.browser.mjs'], ['Community browser regression', 'tests/community.browser.mjs'],
    ['Author studio browser regression', 'tests/author-studio.browser.mjs'], ['Email registration browser regression', 'tests/email-registration.browser.mjs'],
    ['Admin toolbar dialog browser regression', 'tests/admin-toolbar-dialogs.browser.mjs'],
    ['Interaction lab browser regression', 'tests/lab.browser.mjs'],
    ['Internal page interactions', 'tests/internal-interactions.browser.mjs'],
    ['Interaction learning browser regression', 'tests/interaction-learning.browser.mjs'],
    ['Page motion browser regression', 'tests/page-motion.browser.mjs'],
    ['Design primitives browser regression', 'tests/design-primitives.browser.mjs'],
    ['Design studio browser regression', 'tests/design-studio.browser.mjs'],
  ]) run(label, file)
  console.log('\nAll current registration, author, notification, database and browser regressions passed.')
} finally { stop() }
