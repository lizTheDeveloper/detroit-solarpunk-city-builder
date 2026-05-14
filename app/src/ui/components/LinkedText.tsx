import { SOURCE_LINKS } from '@/data/content/source-links';

/**
 * LinkedText — Takes a plain string and returns a React fragment with known
 * organization/source names auto-linked to their real-world URLs.
 *
 * Links open in a new tab and are styled subtly (see .source-link in index.css).
 */
export function LinkedText({ text }: { text: string }) {
  const parts = linkify(text);

  return (
    <>
      {parts.map((part, i) =>
        part.url ? (
          <a
            key={i}
            href={part.url}
            className="source-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            {part.text}
          </a>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </>
  );
}

interface TextPart {
  text: string;
  url?: string;
}

/**
 * Splits input text into segments, replacing known org names with linked parts.
 * SOURCE_LINKS is ordered longest-first, so longer names match before shorter substrings.
 */
function linkify(text: string): TextPart[] {
  const parts: TextPart[] = [{ text }];

  for (const link of SOURCE_LINKS) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      // Only split unlinked segments
      if (part.url) continue;

      const idx = part.text.indexOf(link.name);
      if (idx === -1) continue;

      const newParts: TextPart[] = [];
      const before = part.text.slice(0, idx);
      const after = part.text.slice(idx + link.name.length);

      if (before) newParts.push({ text: before });
      newParts.push({ text: link.name, url: link.url });
      if (after) newParts.push({ text: after });

      parts.splice(i, 1, ...newParts);
    }
  }

  return parts;
}
