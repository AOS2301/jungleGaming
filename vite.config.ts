import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        /**
         * O engine.io-client guarda o WebSocket nativo assim que é carregado, então precisa ser carregado
         * DEPOIS de o MSW instalar o WebSocket simulado (ele é importado sob demanda, em RealtimeProvider).
         * Os parsers são usados também pelo MSW; ficam num chunk próprio para não puxar o cliente junto.
         */
        manualChunks(id) {
          if (/socket\.io-client|engine\.io-client/.test(id)) return 'socket-client'
          if (/socket\.io-parser|engine\.io-parser|component-emitter/.test(id)) return 'socket-parser'
          return undefined
        },
      },
    },
  },
  // O HMR usa outra porta porque o MSW intercepta os WebSockets da origem da página (Socket.IO simulado).
  server: { port: 5173, hmr: { port: 24678 } },
  preview: { port: 4173, strictPort: true },
})
