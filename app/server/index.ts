import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { handleChatProxy } from './chat-proxy.ts';
import { handlePipelineRoute } from './pipeline/routes.ts';
import { startPipelineSchedule } from './pipeline/index.ts';

const PORT = parseInt(process.env.PORT || '3000', 10);
const DIST_DIR = join(import.meta.dirname, '..', 'dist');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = createServer(async (req, res) => {
  const url = req.url || '/';

  if (url === '/api/chat') {
    await handleChatProxy(req, res);
    return;
  }

  // Pipeline API routes
  if (url.startsWith('/api/headlines') || url.startsWith('/api/arc-state') || url.startsWith('/api/health/pipeline')) {
    handlePipelineRoute(req, res);
    return;
  }

  // Serve static files from dist/
  let filePath = join(DIST_DIR, url === '/' ? 'index.html' : url);
  if (!existsSync(filePath)) {
    filePath = join(DIST_DIR, 'index.html');
  }

  try {
    const content = readFileSync(filePath);
    const ext = extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`Detroit Solarpunk City Builder running at http://localhost:${PORT}`);

  // Start the news pipeline scheduler (hourly fetches)
  const stopPipeline = startPipelineSchedule();

  // Graceful shutdown
  process.on('SIGTERM', () => {
    stopPipeline();
    server.close();
  });
  process.on('SIGINT', () => {
    stopPipeline();
    server.close();
  });
});
