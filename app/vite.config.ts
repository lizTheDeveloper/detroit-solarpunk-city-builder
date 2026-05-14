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
  let pipelineStarted = false

  return {
    name: 'pipeline-proxy',
    configureServer(server) {
      // Start the pipeline scheduler once when the dev server starts.
      // This runs an initial fetch immediately then every hour, so The Wire
      // always has fresh headlines without a separate manual ingest step.
      if (!pipelineStarted) {
        pipelineStarted = true
        import('./server/pipeline/index.ts').then(({ startPipelineSchedule }) => {
          startPipelineSchedule()
        }).catch((err) => {
          console.error('[pipeline-proxy] Failed to start pipeline scheduler:', err)
        })
      }

      // Mount pipeline API routes. Vite's connect-style middleware strips the
      // mount prefix from req.url, so we restore the full path before passing
      // to handlePipelineRoute which uses the pathname for routing.
      //
      // Example: request to /api/headlines?limit=10 arrives at handler with
      //   req.url = '/?limit=10'
      // We rewrite it to /api/headlines?limit=10 so the router can match.
      const PIPELINE_ROUTES = ['/api/headlines', '/api/arc-state', '/api/health/pipeline']

      for (const route of PIPELINE_ROUTES) {
        server.middlewares.use(route, async (req, res, next) => {
          try {
            const { handlePipelineRoute } = await import('./server/pipeline/routes.ts')
            // req.url after prefix stripping is '/' or '/?query=...'
            // Rebuild full URL: strip leading '/' then prepend the route
            const stripped = req.url ?? '/'
            const queryPart = stripped.includes('?') ? stripped.slice(stripped.indexOf('?')) : ''
            req.url = route + queryPart
            const handled = handlePipelineRoute(req, res)
            if (!handled) next()
          } catch (err) {
            console.error('[pipeline-proxy] Error handling route:', err)
            next(err)
          }
        })
      }
    },
  }
}

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
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
