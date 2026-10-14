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
          // O engine.io-client captura globalThis.WebSocket ao ser avaliado; precisa carregar DEPOIS
          // do patch do MSW. Por isso fica fora do chunk dos parsers (usados pelo binding do MSW).
          if (id.includes('socket.io-client') || id.includes('engine.io-client')) return 'socket-client'
          if (id.includes('socket.io-parser') || id.includes('engine.io-parser') || id.includes('component-emitter')) return 'socket-parser'
          if (id.includes('@radix-ui')) return 'radix'
          if (id.includes('/msw/') || id.includes('@mswjs') || id.includes('@open-draft') || id.includes('outvariant') || id.includes('strict-event-emitter')) return 'msw'
          return undefined
        },
      },
    },
  },
  // HMR em porta própria: o MSW intercepta WebSockets da origem da página (Socket.IO simulado).
  server: { port: 5173, strictPort: false, hmr: { port: 24678 } },
  preview: { port: 4173, strictPort: true },
})
