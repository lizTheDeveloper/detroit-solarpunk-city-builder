import type { RawHeadline } from '../types.ts';
import { hashUrl } from '../utils.ts';

/**
 * Generic RSS parser for standard RSS 2.0 feeds.
 * Used for Detroit local news sources (Bridge Detroit, Planet Detroit, etc.)
 * and any other standard RSS feed.
 *
 * No external XML parsing dependency — uses regex extraction like the
 * memeorandum parser, but without source-specific logic.
 */
export function parseGenericRss(xml: string, sourceId: string, fetchedAt?: string): RawHeadline[] {
  const now = fetchedAt ?? new Date().toISOString();

  try {
    const items = xml.match(/<item[\s>][\s\S]*?<\/item>/g);
    if (!items) return [];

    return items
      .map(item => {
        const headline = extractTag(item, 'title');
        const url = extractTag(item, 'link');
        const pubDate = extractTag(item, 'pubDate');

        if (!headline || !url) return null;

        return {
          id: hashUrl(url),
          source: sourceId,
          date: pubDate ? new Date(pubDate).toISOString() : now,
          headline: decodeEntities(headline.trim()),
          url,
          metadata: {},
          fetchedAt: now,
        };
      })
      .filter((h): h is RawHeadline => h !== null);
  } catch {
    return [];
  }
}

/**
 * Extract text content of a specific XML tag.
 * Handles CDATA sections and regular text content.
 */
function extractTag(xml: string, tag: string): string | null {
  // Handle CDATA sections
  const cdataRegex = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i');
  const cdataMatch = cdataRegex.exec(xml);
  if (cdataMatch) return cdataMatch[1];

  // Handle regular text content
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const match = regex.exec(xml);
  if (match) return match[1].trim();

  // Handle self-closing or empty tag followed by URL (common RSS pattern for <link>)
  if (tag === 'link') {
    const linkRegex = /<link[^>]*>([^<\s]+)/i;
    const linkMatch = linkRegex.exec(xml);
    if (linkMatch) return linkMatch[1].trim();
  }

  return null;
}

/**
 * Decode common HTML/XML entities found in RSS feeds.
 */
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#8217;/g, '’')
    .replace(/&#8216;/g, '‘')
    .replace(/&#8220;/g, '“')
    .replace(/&#8221;/g, '”')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—');
}
