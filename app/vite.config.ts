/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import type { Plugin } from 'vite'

function chatProxyPlugin(): Plugin {
  return {
    name: 'chat-proxy',
    configureServer(server) {
      server.middlewares.use('/api/chat', async (req, res) => {
        const { handleChatProxy } = await import('./server/chat-proxy.ts')
        await handleChatProxy(req, res)
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), chatProxyPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
