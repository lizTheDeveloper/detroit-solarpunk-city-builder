import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import type { RawHeadline, ProcessedHeadline } from './types.ts';
import { getDateString, createLogger } from './utils.ts';

const log = createLogger('storage');

/**
 * Store raw headlines as unclassified ProcessedHeadlines in the daily file.
 * Headlines are stored per-day for easy management and retention.
 */
export function storeHeadlines(dataDir: string, rawHeadlines: RawHeadline[]): ProcessedHeadline[] {
  if (rawHeadlines.length === 0) return [];

  const headlinesDir = join(dataDir, 'headlines');
  if (!existsSync(headlinesDir)) {
    mkdirSync(headlinesDir, { recursive: true });
  }

  // Group headlines by date
  const byDate = new Map<string, RawHeadline[]>();
  for (const h of rawHeadlines) {
    const dateKey = getDateString(new Date(h.date));
    if (!byDate.has(dateKey)) byDate.set(dateKey, []);
    byDate.get(dateKey)!.push(h);
  }

  const stored: ProcessedHeadline[] = [];

  for (const [dateKey, headlines] of byDate) {
    const filePath = join(headlinesDir, `${dateKey}.json`);

    // Load existing headlines for this day
    let existing: ProcessedHeadline[] = [];
    if (existsSync(filePath)) {
      try {
        existing = JSON.parse(readFileSync(filePath, 'utf-8'));
      } catch {
        log.warn(`Corrupted headline file ${filePath}, starting fresh`);
      }
    }

    // Add new headlines as unclassified
    const newProcessed: ProcessedHeadline[] = headlines.map(h => ({
      ...h,
      classified: false,
      arcs: [],
      severity: 0,
      locality: null,
      confidence: 0,
    }));

    const combined = [...existing, ...newProcessed];
    writeFileSync(filePath, JSON.stringify(combined, null, 2), 'utf-8');
    stored.push(...newProcessed);

    log.info(`Stored ${newProcessed.length} headlines to ${dateKey}.json (total: ${combined.length})`);
  }

  return stored;
}

/**
 * Load headlines from storage, with optional filters.
 */
export function loadHeadlines(
  dataDir: string,
  filters?: {
    arc?: string;
    severity?: number;
    locality?: string;
    since?: string;
    limit?: number;
  }
): ProcessedHeadline[] {
  const headlinesDir = join(dataDir, 'headlines');
  if (!existsSync(headlinesDir)) return [];

  let files: string[];
  try {
    files = readdirSync(headlinesDir)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse(); // Most recent first
  } catch {
    return [];
  }

  // If we have a 'since' filter, skip files that are too old
  const sinceDate = filters?.since ? filters.since.split('T')[0] : null;

  let allHeadlines: ProcessedHeadline[] = [];

  for (const file of files) {
    const fileDate = file.replace('.json', '');

    // Skip files older than the 'since' filter
    if (sinceDate && fileDate < sinceDate) break;

    try {
      const content = readFileSync(join(headlinesDir, file), 'utf-8');
      const headlines = JSON.parse(content) as ProcessedHeadline[];
      allHeadlines.push(...headlines);
    } catch {
      continue;
    }
  }

  // Sort by date descending
  allHeadlines.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Apply filters
  if (filters?.since) {
    const sinceTime = new Date(filters.since).getTime();
    allHeadlines = allHeadlines.filter(h => new Date(h.date).getTime() >= sinceTime);
  }

  if (filters?.arc) {
    allHeadlines = allHeadlines.filter(h => h.arcs.includes(filters.arc!));
  }

  if (filters?.severity != null) {
    allHeadlines = allHeadlines.filter(h => h.severity >= filters.severity!);
  }

  if (filters?.locality) {
    allHeadlines = allHeadlines.filter(h => h.locality === filters.locality);
  }

  if (filters?.limit) {
    allHeadlines = allHeadlines.slice(0, filters.limit);
  }

  return allHeadlines;
}

/**
 * Get total headline count and unclassified count for health reporting.
 */
export function getHeadlineStats(dataDir: string): { total: number; unclassified: number } {
  const headlinesDir = join(dataDir, 'headlines');
  if (!existsSync(headlinesDir)) return { total: 0, unclassified: 0 };

  let total = 0;
  let unclassified = 0;

  let files: string[];
  try {
    files = readdirSync(headlinesDir).filter(f => f.endsWith('.json'));
  } catch {
    return { total: 0, unclassified: 0 };
  }

  for (const file of files) {
    try {
      const content = readFileSync(join(headlinesDir, file), 'utf-8');
      const headlines = JSON.parse(content) as ProcessedHeadline[];
      total += headlines.length;
      unclassified += headlines.filter(h => !h.classified).length;
    } catch {
      continue;
    }
  }

  return { total, unclassified };
}
