import { describe, it, expect } from 'vitest';
import { parseBlueskyTrending } from './bluesky-trending.ts';
import { parseMemeorandum } from './memeorandum.ts';

const FETCHED_AT = '2026-05-05T12:00:00.000Z';

describe('parseBlueskyTrending', () => {
  it('parses a flat array of items', () => {
    const data = [
      {
        url: 'https://example.com/article-1',
        title: 'Detroit Grid Outage Reaches Day Three',
        date: '2026-05-05T10:00:00.000Z',
        likes: 450,
        reposts: 120,
      },
      {
        url: 'https://example.com/article-2',
        title: 'Solar Microgrid Saves Neighborhood',
        date: '2026-05-05T09:00:00.000Z',
        score: 89,
      },
    ];

    const result = parseBlueskyTrending(data, FETCHED_AT);

    expect(result).toHaveLength(2);
    expect(result[0].headline).toBe('Detroit Grid Outage Reaches Day Three');
    expect(result[0].source).toBe('theblue_report');
    expect(result[0].url).toBe('https://example.com/article-1');
    expect(result[0].metadata.likes).toBe(450);
    expect(result[0].metadata.reposts).toBe(120);
    expect(result[0].id).toHaveLength(16); // SHA256 truncated to 16 hex chars
  });

  it('parses items nested under a "feed" key', () => {
    const data = {
      feed: [
        { url: 'https://example.com/test', title: 'Test Headline', date: '2026-05-05T08:00:00.000Z' },
      ],
    };

    const result = parseBlueskyTrending(data, FETCHED_AT);
    expect(result).toHaveLength(1);
    expect(result[0].headline).toBe('Test Headline');
  });

  it('skips items without url', () => {
    const data = [
      { title: 'No URL Headline' },
      { url: 'https://example.com/valid', title: 'Valid' },
    ];

    const result = parseBlueskyTrending(data, FETCHED_AT);
    expect(result).toHaveLength(1);
    expect(result[0].headline).toBe('Valid');
  });

  it('skips items without title', () => {
    const data = [
      { url: 'https://example.com/no-title' },
      { url: 'https://example.com/valid', title: 'Valid' },
    ];

    const result = parseBlueskyTrending(data, FETCHED_AT);
    expect(result).toHaveLength(1);
  });

  it('uses fetchedAt when no date is present', () => {
    const data = [{ url: 'https://example.com/x', title: 'No Date' }];
    const result = parseBlueskyTrending(data, FETCHED_AT);
    expect(result[0].date).toBe(FETCHED_AT);
  });

  it('throws on completely invalid data', () => {
    expect(() => parseBlueskyTrending('not json', FETCHED_AT)).toThrow();
    expect(() => parseBlueskyTrending(42, FETCHED_AT)).toThrow();
  });

  it('generates consistent IDs for same URL', () => {
    const data = [
      { url: 'https://example.com/consistent', title: 'First' },
    ];
    const result1 = parseBlueskyTrending(data, FETCHED_AT);
    const result2 = parseBlueskyTrending(data, '2026-05-06T00:00:00.000Z');
    expect(result1[0].id).toBe(result2[0].id);
  });
});

describe('parseMemeorandum', () => {
  const sampleRss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>memeorandum</title>
    <item>
      <title>DTE Energy Faces Scrutiny Over Grid Maintenance</title>
      <link>https://www.freep.com/dte-grid-2026</link>
      <pubDate>Mon, 05 May 2026 10:00:00 GMT</pubDate>
      <description><![CDATA[Discussion: <a href="https://related1.com">Related 1</a>, <a href="https://related2.com">Related 2</a>]]></description>
      <guid>https://www.freep.com/dte-grid-2026</guid>
    </item>
    <item>
      <title>Michigan PFAS Cleanup &amp; Funding Bill Advances</title>
      <link>https://www.mlive.com/pfas-bill</link>
      <pubDate>Mon, 05 May 2026 08:30:00 GMT</pubDate>
      <description>No related links here</description>
    </item>
  </channel>
</rss>`;

  it('parses RSS items correctly', () => {
    const result = parseMemeorandum(sampleRss, FETCHED_AT);

    expect(result).toHaveLength(2);
    expect(result[0].headline).toBe('DTE Energy Faces Scrutiny Over Grid Maintenance');
    expect(result[0].url).toBe('https://www.freep.com/dte-grid-2026');
    expect(result[0].source).toBe('memeorandum');
    expect(result[0].date).toBe('2026-05-05T10:00:00.000Z');
  });

  it('decodes HTML entities in titles', () => {
    const result = parseMemeorandum(sampleRss, FETCHED_AT);
    expect(result[1].headline).toBe('Michigan PFAS Cleanup & Funding Bill Advances');
  });

  it('extracts related links from CDATA description', () => {
    const result = parseMemeorandum(sampleRss, FETCHED_AT);
    const links = result[0].metadata.relatedLinks as string[];
    expect(links).toContain('https://related1.com');
    expect(links).toContain('https://related2.com');
    expect(result[0].metadata.clusterSize).toBe(2);
  });

  it('handles items without description gracefully', () => {
    const rss = `<rss><channel><item>
      <title>Simple Item</title>
      <link>https://example.com/simple</link>
    </item></channel></rss>`;

    const result = parseMemeorandum(rss, FETCHED_AT);
    expect(result).toHaveLength(1);
    expect(result[0].headline).toBe('Simple Item');
    expect(result[0].date).toBe(FETCHED_AT); // no pubDate, uses fetchedAt
  });

  it('returns empty array for invalid XML', () => {
    const result = parseMemeorandum('not xml at all', FETCHED_AT);
    expect(result).toHaveLength(0);
  });

  it('generates stable IDs from URLs', () => {
    const result1 = parseMemeorandum(sampleRss, FETCHED_AT);
    const result2 = parseMemeorandum(sampleRss, '2026-05-06T00:00:00.000Z');
    expect(result1[0].id).toBe(result2[0].id);
  });
});
