import type { RawHeadline } from '../types.ts';
import { hashUrl } from '../utils.ts';

/**
 * Parser for memeorandum RSS feed.
 * Feed URL: http://www.memeorandum.com/feed.xml
 *
 * Minimal RSS/XML parser — extracts <item> elements with <title>, <link>, <pubDate>, <description>.
 * No external XML parsing dependency required.
 */
export function parseMemeorandum(xmlText: string, fetchedAt: string): RawHeadline[] {
  const headlines: RawHeadline[] = [];
  const items = extractItems(xmlText);

  for (const itemXml of items) {
    const title = extractTag(itemXml, 'title');
    const link = extractTag(itemXml, 'link');
    const pubDate = extractTag(itemXml, 'pubDate');
    const description = extractTag(itemXml, 'description');
    const guid = extractTag(itemXml, 'guid');

    if (!link || !title) continue;

    // Extract cluster/related links from description HTML if present
    const metadata: Record<string, unknown> = {};
    if (description) {
      const relatedLinks = extractLinksFromHtml(description);
      if (relatedLinks.length > 0) {
        metadata.relatedLinks = relatedLinks;
        metadata.clusterSize = relatedLinks.length;
      }
    }
    if (guid) metadata.guid = guid;

    headlines.push({
      id: hashUrl(link),
      source: 'memeorandum',
      date: pubDate ? new Date(pubDate).toISOString() : fetchedAt,
      headline: decodeHtmlEntities(title.trim()),
      url: link,
      metadata,
      fetchedAt,
    });
  }

  return headlines;
}

/**
 * Extract all <item>...</item> blocks from RSS XML.
 */
function extractItems(xml: string): string[] {
  const items: string[] = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(xml)) !== null) {
    items.push(match[1]);
  }
  return items;
}

/**
 * Extract text content of a specific XML tag.
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
 * Extract href URLs from HTML content (for related coverage links in memeorandum descriptions).
 */
function extractLinksFromHtml(html: string): string[] {
  const links: string[] = [];
  const hrefRegex = /href=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = hrefRegex.exec(html)) !== null) {
    if (match[1].startsWith('http')) {
      links.push(match[1]);
    }
  }
  return links;
}

/**
 * Decode common HTML entities in RSS text.
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}
