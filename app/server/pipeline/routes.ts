import type { IncomingMessage, ServerResponse } from 'http';
import { loadHeadlines, getHeadlineStats } from './storage.ts';
import { loadAllArcStates } from './arc-state.ts';
import { getPipelineHealth } from './index.ts';
import { getDataDir } from './index.ts';

/**
 * Handle pipeline API routes. Returns true if the route was handled.
 */
export function handlePipelineRoute(req: IncomingMessage, res: ServerResponse): boolean {
  const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname;

  switch (pathname) {
    case '/api/headlines':
      handleHeadlines(urlObj, res);
      return true;
    case '/api/arc-state':
      handleArcState(res);
      return true;
    case '/api/health/pipeline':
      handleHealth(res);
      return true;
    default:
      return false;
  }
}

function handleHeadlines(urlObj: URL, res: ServerResponse) {
  const params = urlObj.searchParams;

  const filters: {
    arc?: string;
    severity?: number;
    locality?: string;
    since?: string;
    limit?: number;
  } = {};

  if (params.has('arc')) filters.arc = params.get('arc')!;
  if (params.has('severity')) filters.severity = parseInt(params.get('severity')!, 10);
  if (params.has('locality')) filters.locality = params.get('locality')!;
  if (params.has('since')) filters.since = params.get('since')!;
  if (params.has('limit')) filters.limit = parseInt(params.get('limit')!, 10);

  const dataDir = getDataDir();
  const headlines = loadHeadlines(dataDir, filters);

  sendJson(res, headlines, {
    'Cache-Control': 'public, max-age=900', // 15 minutes
  });
}

function handleArcState(res: ServerResponse) {
  const dataDir = getDataDir();
  const states = loadAllArcStates(dataDir);

  sendJson(res, states, {
    'Cache-Control': 'public, max-age=300', // 5 minutes
  });
}

function handleHealth(res: ServerResponse) {
  const health = getPipelineHealth();
  const dataDir = getDataDir();
  const stats = getHeadlineStats(dataDir);

  const response = {
    ...health,
    unclassifiedCount: stats.unclassified,
    totalHeadlines: stats.total,
  };

  sendJson(res, response, {
    'Cache-Control': 'no-cache',
  });
}

function sendJson(res: ServerResponse, data: unknown, headers: Record<string, string> = {}) {
  const body = JSON.stringify(data);
  res.writeHead(200, {
    'Content-Type': 'application/json',
    ...headers,
  });
  res.end(body);
}
