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

function pipelineProxyPlugin(): Plugin {
  return {
    name: 'pipeline-proxy',
    configureServer(server) {
      server.middlewares.use('/api/headlines', async (req, res) => {
        const { handlePipelineRoute } = await import('./server/pipeline/routes.ts')
        handlePipelineRoute(req, res)
      })
      server.middlewares.use('/api/arc-state', async (req, res) => {
        const { handlePipelineRoute } = await import('./server/pipeline/routes.ts')
        handlePipelineRoute(req, res)
      })
      server.middlewares.use('/api/health/pipeline', async (req, res) => {
        const { handlePipelineRoute } = await import('./server/pipeline/routes.ts')
        handlePipelineRoute(req, res)
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), chatProxyPlugin(), pipelineProxyPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'server/**/*.test.ts'],
  },
})
