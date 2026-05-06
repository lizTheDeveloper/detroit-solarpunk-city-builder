import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import type { FeedSource, RawHeadline } from './types.ts';
import { parseBlueskyTrending } from './parsers/bluesky-trending.ts';
import { parseMemeorandum } from './parsers/memeorandum.ts';
import { parseGenericRss } from './parsers/rss-generic.ts';
import { createLogger } from './utils.ts';

const log = createLogger('fetcher');

const FETCH_TIMEOUT_MS = 30_000;

/**
 * Load feed source configuration from disk.
 */
export function loadFeedConfig(): FeedSource[] {
  const configPath = join(import.meta.dirname, 'config', 'feeds.json');
  const raw = readFileSync(configPath, 'utf-8');
  const config = JSON.parse(raw) as { sources: FeedSource[] };
  return config.sources;
}

/**
 * Fetch all configured feed sources and return parsed headlines.
 * Each source is isolated — one failure does not block others.
 */
export async function fetchAllSources(
  sources: FeedSource[],
  seenIds: Set<string>
): Promise<{
  headlines: RawHeadline[];
  results: Array<{ source: string; success: boolean; count: number; error?: string }>;
}> {
  const allHeadlines: RawHeadline[] = [];
  const results: Array<{ source: string; success: boolean; count: number; error?: string }> = [];

  for (const source of sources) {
    try {
      const headlines = await fetchSource(source, seenIds);
      allHeadlines.push(...headlines);
      results.push({ source: source.id, success: true, count: headlines.length });
      log.info(`Fetched ${headlines.length} new headlines from ${source.id}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      results.push({ source: source.id, success: false, count: 0, error: errorMsg });
      log.error(`Failed to fetch from ${source.id}`, errorMsg);
    }
  }

  return { headlines: allHeadlines, results };
}

/**
 * Fetch and parse a single feed source.
 * Deduplicates against the provided set of already-seen headline IDs.
 */
async function fetchSource(source: FeedSource, seenIds: Set<string>): Promise<RawHeadline[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'DetroitSolarpunkCityBuilder/1.0 (game news pipeline)',
      },
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${source.url}`);
  }

  const fetchedAt = new Date().toISOString();
  let headlines: RawHeadline[];

  switch (source.parser) {
    case 'bluesky-trending': {
      const json = await response.json();
      headlines = parseBlueskyTrending(json, fetchedAt);
      break;
    }
    case 'memeorandum': {
      const text = await response.text();
      headlines = parseMemeorandum(text, fetchedAt);
      break;
    }
    case 'rss-generic': {
      const text = await response.text();
      headlines = parseGenericRss(text, source.id, fetchedAt);
      break;
    }
    default:
      throw new Error(`Unknown parser: ${source.parser}`);
  }

  // Deduplicate against already-seen IDs
  const newHeadlines = headlines.filter(h => !seenIds.has(h.id));
  return newHeadlines;
}

/**
 * Load set of already-seen headline IDs from stored data files.
 * Scans all headline JSON files in the data directory.
 */
export function loadSeenIds(dataDir: string): Set<string> {
  const seenIds = new Set<string>();
  const headlinesDir = join(dataDir, 'headlines');

  if (!existsSync(headlinesDir)) return seenIds;

  // Read all daily headline files
  let files: string[];
  try {
    files = readdirSync(headlinesDir).filter((f: string) => f.endsWith('.json'));
  } catch {
    return seenIds;
  }

  for (const file of files) {
    try {
      const content = readFileSync(join(headlinesDir, file), 'utf-8');
      const headlines = JSON.parse(content) as Array<{ id: string }>;
      for (const h of headlines) {
        seenIds.add(h.id);
      }
    } catch {
      // Skip corrupted files
    }
  }

  return seenIds;
}
