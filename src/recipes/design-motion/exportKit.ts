import type { MotionOptions, MotionRecipe } from './model'
import { normalizeOptions } from './model'
import model from './model.ts?raw'
import reducedMotion from './useReducedMotion.ts?raw'
import transition from './TransitionStage.tsx?raw'
import scrolling from './ScrollScene.tsx?raw'
import text from './MotionText.tsx?raw'
import button from './MotionButton.tsx?raw'
import motionCss from './motion.css?raw'
import controlCss from './controls.css?raw'
import { motionSources } from './sources'

export function exampleSource(recipe: MotionRecipe, input: MotionOptions, title = '以图为引，寻见山河。') {
  const options = normalizeOptions(input)
  const component = recipe.category === 'transition' ? 'TransitionStage' : recipe.category === 'text' ? 'MotionText' : recipe.category === 'button' ? 'MotionButton' : 'ScrollScene'
  const file = recipe.category === 'transition' ? 'TransitionStage' : recipe.category === 'text' ? 'MotionText' : recipe.category === 'button' ? 'MotionButton' : 'ScrollScene'
  const props = `variant="${recipe.id}" options={options}`
  const element = recipe.category === 'button'
    ? `<MotionButton ${props} onClick={() => setMessage('已触发按钮操作')}>{title}</MotionButton>`
    : recipe.category === 'text'
      ? `<MotionText ${props} text={title} replay={replay} />`
      : `<${component} ${props} replay={replay} />`
  return `import { useState } from 'react'
import { ${component} } from './design-motion/${file}'

const options = ${JSON.stringify(options, null, 2)}
const title = ${JSON.stringify(title.slice(0, 120))}

export default function App() {
  const [${recipe.category === 'button' ? 'message, setMessage' : 'replay, setReplay'}] = useState(${recipe.category === 'button' ? "''" : '0'})
  return <main style={{ maxWidth: 900, margin: '40px auto', padding: 24 }}>
    <h1>${recipe.title}</h1>
    ${element}
    ${recipe.category === 'button' ? '<p role="status">{message}</p>' : '<button type="button" onClick={() => setReplay(value => value + 1)}>重播效果</button>'}
  </main>
}
`
}

/** 只导出本地原创实现和来源说明，不把参考网站代码/图片打入包内。 */
export function sourceFiles(recipe: MotionRecipe, options: MotionOptions, title: string): Record<string, string> {
  return {
    'src/App.tsx': exampleSource(recipe, options, title),
    'src/design-motion/model.ts': model,
    'src/design-motion/useReducedMotion.ts': reducedMotion,
    'src/design-motion/TransitionStage.tsx': transition,
    'src/design-motion/ScrollScene.tsx': scrolling,
    'src/design-motion/MotionText.tsx': text,
    'src/design-motion/MotionButton.tsx': button,
    'src/design-motion/motion.css': motionCss,
    'src/design-motion/controls.css': controlCss,
    'src/main.tsx': "import { StrictMode } from 'react'\nimport { createRoot } from 'react-dom/client'\nimport App from './App'\nimport './base.css'\ncreateRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)\n",
    'src/base.css': '*{box-sizing:border-box}body{margin:0;background:#101713;color:#e9e0cf;font-family:serif}button{font:inherit}h1{font-weight:400;font-size:28px}main>button{margin-top:24px;padding:10px 20px}button:focus-visible{outline:2px solid #d6b77a;outline-offset:4px}',
    'index.html': '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>动效学习示例</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>',
    'package.json': JSON.stringify({ name: 'tiantufu-motion-example', private: true, type: 'module', scripts: { dev: 'vite', build: 'tsc --noEmit && vite build' }, dependencies: { react: '^18.3.1', 'react-dom': '^18.3.1' }, devDependencies: { vite: '^8.2.0', '@vitejs/plugin-react': '^6.0.4', typescript: '~6.0.2', '@types/react': '^18.3.31', '@types/react-dom': '^18.3.7', '@types/node': '^24.13.3' }, engines: { node: '>=22.12' } }, null, 2),
    'tsconfig.json': JSON.stringify({ compilerOptions: { target: 'ES2023', lib: ['ES2023', 'DOM'], module: 'ESNext', moduleResolution: 'bundler', jsx: 'react-jsx', strict: true, noEmit: true, skipLibCheck: true, types: ['vite/client'] }, include: ['src'] }, null, 2),
    'vite.config.ts': "import { defineConfig } from 'vite'\nimport react from '@vitejs/plugin-react'\nexport default defineConfig({ plugins: [react()], base: './' })\n",
    'sources.json': JSON.stringify(motionSources, null, 2),
    'preset.json': JSON.stringify({ schema: 'ttf-motion-recipe-v1', recipe: recipe.id, options: normalizeOptions(options), title }, null, 2),
    'README.md': `# 天图府动效示例 · ${recipe.title}

此包由制作端导出，包含正在预览的参数和同一份原创组件源码。

## 运行
使用 Node >=22.12，在此目录执行 pnpm install，然后 pnpm dev；生产构建为 pnpm build。
先阅读 src/App.tsx，再阅读 src/design-motion 中对应组件。已有 React 项目可直接复制该目录并按示例导入。

## 边界
本包没有账号、数据库、外部素材或自动持久化。按钮点击示例只更新状态，请在 onClick 接自己的业务。
系统减少动态和 html[data-motion="reduced"] 均优先。
src/design-motion 中代码为天图府独立实现，不包含十个参考站的品牌资源或组件源码。
来源与访问/许可边界见 sources.json；本导出不授予参考站内容的再分发权。
`,
  }
}

// ZIP STORE：UTF-8 文件名、CRC32 与中央目录，无第三方依赖。内容为可审阅的文本文件。
function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}
export function makeSourceZip(files: Record<string, string>): Blob {
  const encoder = new TextEncoder()
  const parts: BlobPart[] = [], central: BlobPart[] = []
  let offset = 0, centralLength = 0
  for (const [name, contents] of Object.entries(files)) {
    const filename = encoder.encode(name), data = encoder.encode(contents), crc = crc32(data)
    const local = new Uint8Array(30 + filename.length), localView = new DataView(local.buffer)
    localView.setUint32(0, 0x04034b50, true)
    localView.setUint16(4, 20, true); localView.setUint16(6, 0x800, true); localView.setUint16(12, 0x21, true)
    localView.setUint32(14, crc, true); localView.setUint32(18, data.length, true); localView.setUint32(22, data.length, true)
    localView.setUint16(26, filename.length, true); local.set(filename, 30)
    const entry = new Uint8Array(46 + filename.length), view = new DataView(entry.buffer)
    view.setUint32(0, 0x02014b50, true); view.setUint16(4, 20, true); view.setUint16(6, 20, true); view.setUint16(8, 0x800, true)
    view.setUint16(14, 0x21, true); view.setUint32(16, crc, true); view.setUint32(20, data.length, true); view.setUint32(24, data.length, true)
    view.setUint16(28, filename.length, true); view.setUint32(42, offset, true); entry.set(filename, 46)
    parts.push(local.buffer, data.buffer); central.push(entry.buffer)
    offset += local.length + data.length; centralLength += entry.length
  }
  const end = new Uint8Array(22), view = new DataView(end.buffer), count = Object.keys(files).length
  view.setUint32(0, 0x06054b50, true); view.setUint16(8, count, true); view.setUint16(10, count, true)
  view.setUint32(12, centralLength, true); view.setUint32(16, offset, true)
  return new Blob([...parts, ...central, end.buffer], { type: 'application/zip' })
}
