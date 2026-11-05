import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env }
  for (const [name, value] of Object.entries(env)) {
    if (!name.startsWith('VITE_') || !value) continue
    const candidate = value.trim()
    if (candidate.startsWith('sb_secret_') || /PRIVATE_KEY|DISPATCH_SECRET|SERVICE_ROLE|DATABASE_PASSWORD/.test(name)) throw new Error('Server secrets cannot be exposed through VITE_* variables. Move them to server settings.')
    if (candidate.startsWith('eyJ')) {
      let role: string | undefined
      try { role = JSON.parse(Buffer.from(candidate.split('.')[1], 'base64url').toString()).role } catch { /* Non-JWT settings are validated by their consumer. */ }
      if (role === 'service_role') throw new Error('A service_role key must never be used in a VITE_* variable.')
    }
  }
  return {
  plugins: [react(), tailwindcss()],
  base: './', // 相对路径构建：支持离线打开 / 子目录部署 / 发给他人本地预览
  build: {
    // Keep optional motion/3D/cloud dependencies out of the initial route
    // chunk. This improves deploy/download reliability without hiding the
    // warning by simply raising chunkSizeWarningLimit.
    rollupOptions: {
      input: { main: 'index.html', learning: 'learning/interaction-atlas/index.html' },
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('three')) return 'vendor-three'
          if (id.includes('gsap') || id.includes('@gsap')) return 'vendor-motion'
          if (id.includes('@supabase')) return 'vendor-supabase'
          if (id.includes('lucide-react')) return 'vendor-icons'
          return 'vendor'
        },
      },
    },
  },
  }
})
