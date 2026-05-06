import type { RawHeadline } from '../types.ts';
import { hashUrl } from '../utils.ts';

/**
 * Parser for theblue.report JSON feed (Bluesky trending links).
 * Feed URL: https://data.theblue.report/feeds/top-day.json
 *
 * Expected format: Array of objects with at minimum { url, title } fields.
 * Actual shape may include engagement metrics, timestamps, etc.
 */
export function parseBlueskyTrending(data: unknown, fetchedAt: string): RawHeadline[] {
  if (!data || !Array.isArray(data)) {
    // The feed might wrap items in a top-level object
    const obj = data as Record<string, unknown>;
    const items = obj?.feed || obj?.items || obj?.posts || obj?.data;
    if (!Array.isArray(items)) {
      throw new Error('Bluesky trending feed: unexpected format — no array found at top level or under feed/items/posts/data keys');
    }
    return parseItems(items, fetchedAt);
  }
  return parseItems(data, fetchedAt);
}

function parseItems(items: unknown[], fetchedAt: string): RawHeadline[] {
  const headlines: RawHeadline[] = [];

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const entry = item as Record<string, unknown>;

    // Extract URL — try common field names
    const url = (entry.url || entry.link || entry.href) as string | undefined;
    if (!url || typeof url !== 'string') continue;

    // Extract headline text
    const headline = (entry.title || entry.text || entry.headline || entry.description) as string | undefined;
    if (!headline || typeof headline !== 'string') continue;

    // Extract timestamp
    const date = (entry.date || entry.timestamp || entry.created_at || entry.published_at || entry.indexedAt) as string | undefined;

    // Extract engagement metrics as metadata
    const metadata: Record<string, unknown> = {};
    if (entry.likes != null) metadata.likes = entry.likes;
    if (entry.reposts != null) metadata.reposts = entry.reposts;
    if (entry.replies != null) metadata.replies = entry.replies;
    if (entry.engagement != null) metadata.engagement = entry.engagement;
    if (entry.score != null) metadata.score = entry.score;
    if (entry.author != null) metadata.author = entry.author;
    if (entry.domain != null) metadata.domain = entry.domain;

    headlines.push({
      id: hashUrl(url),
      source: 'theblue_report',
      date: date || fetchedAt,
      headline: headline.trim(),
      url,
      metadata,
      fetchedAt,
    });
  }

  return headlines;
}
