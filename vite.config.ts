import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  build: {
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react'
          if (id.includes('@tanstack')) return 'tanstack'
          if (id.includes('socket.io') || id.includes('engine.io')) return 'socket'
          if (id.includes('@radix-ui')) return 'radix'
          if (id.includes('/msw/') || id.includes('@mswjs') || id.includes('@open-draft') || id.includes('outvariant') || id.includes('strict-event-emitter')) return 'msw'
          return undefined
        },
      },
    },
  },
  server: { port: 5173, strictPort: false },
  preview: { port: 4173, strictPort: true },
})
