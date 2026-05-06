import { describe, it, expect } from 'vitest';
import { parseGenericRss } from './rss-generic';

const SAMPLE_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Bridge Detroit</title>
    <item>
      <title>Detroit council approves new solar initiative</title>
      <link>https://www.bridgedetroit.com/solar-initiative</link>
      <pubDate>Mon, 05 May 2026 10:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Water rates to increase in July</title>
      <link>https://www.bridgedetroit.com/water-rates</link>
      <pubDate>Sun, 04 May 2026 14:30:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

describe('parseGenericRss', () => {
  it('extracts headlines from standard RSS', () => {
    const headlines = parseGenericRss(SAMPLE_RSS, 'bridge_detroit');
    expect(headlines).toHaveLength(2);
    expect(headlines[0].headline).toBe('Detroit council approves new solar initiative');
    expect(headlines[0].url).toBe('https://www.bridgedetroit.com/solar-initiative');
    expect(headlines[0].source).toBe('bridge_detroit');
  });

  it('generates stable IDs from URLs', () => {
    const headlines1 = parseGenericRss(SAMPLE_RSS, 'bridge_detroit');
    const headlines2 = parseGenericRss(SAMPLE_RSS, 'bridge_detroit');
    expect(headlines1[0].id).toBe(headlines2[0].id);
    expect(headlines1[0].id).toHaveLength(16);
  });

  it('parses pubDate into ISO format', () => {
    const headlines = parseGenericRss(SAMPLE_RSS, 'bridge_detroit');
    expect(headlines[0].date).toBe('2026-05-05T10:00:00.000Z');
    expect(headlines[1].date).toBe('2026-05-04T14:30:00.000Z');
  });

  it('handles HTML entities in titles', () => {
    const rss = SAMPLE_RSS.replace(
      'new solar initiative',
      'city&#39;s &amp; county&#8217;s plan'
    );
    const headlines = parseGenericRss(rss, 'test');
    expect(headlines[0].headline).toContain("city's & county");
  });

  it('handles CDATA-wrapped titles', () => {
    const rss = SAMPLE_RSS.replace(
      '<title>Detroit council approves new solar initiative</title>',
      '<title><![CDATA[Detroit council approves new solar initiative]]></title>'
    );
    const headlines = parseGenericRss(rss, 'test');
    expect(headlines[0].headline).toBe('Detroit council approves new solar initiative');
  });

  it('skips items missing title or link', () => {
    const rss = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <item><title>No link here</title></item>
  <item><link>https://example.com/no-title</link></item>
  <item>
    <title>Has both</title>
    <link>https://example.com/good</link>
  </item>
</channel></rss>`;
    const headlines = parseGenericRss(rss, 'test');
    expect(headlines).toHaveLength(1);
    expect(headlines[0].headline).toBe('Has both');
  });

  it('returns empty array for malformed RSS', () => {
    const headlines = parseGenericRss('not xml at all', 'test');
    expect(headlines).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    const headlines = parseGenericRss('', 'test');
    expect(headlines).toEqual([]);
  });

  it('uses provided fetchedAt timestamp', () => {
    const fetchedAt = '2026-01-01T00:00:00.000Z';
    const headlines = parseGenericRss(SAMPLE_RSS, 'test', fetchedAt);
    expect(headlines[0].fetchedAt).toBe(fetchedAt);
  });
});
