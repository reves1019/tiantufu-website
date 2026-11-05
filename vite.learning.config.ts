import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 独立学习产物不复制 public 作品素材，也不引入 App / ContentProvider。
export default defineConfig({
  plugins: [react()],
  base: './',
  publicDir: false,
  envDir: 'learning/interaction-atlas',
  envPrefix: 'LEARNING_PUBLIC_',
  build: {
    outDir: 'output/interaction-learning',
    rollupOptions: { input: 'learning/interaction-atlas/index.html' },
  },
})
