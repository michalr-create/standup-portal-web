/** How many approved items search loads before near-duplicate collapse. */
export const SEARCH_CANDIDATE_LIMIT = 48;
/** Unique items shown after collapse. */
export const SEARCH_RESULT_LIMIT = 24;

export type SearchDedupeItem = {
  title: string;
  published_at: string | null;
  episode_group_id: string | null;
};

export type SearchHighlightPart = {
  text: string;
  match: boolean;
};

/**
 * Case-fold and strip punctuation so "Foo - Bar" and "Foo — Bar" share a key.
 * Emoji is ignored when the title still has words ("Tytuł 🎙️" and "Tytuł").
 * Emoji-only titles keep the emoji, so "🖤" does not collapse into "😅".
 * An empty result means "no title identity" — callers must not collapse those rows.
 */
export function normalizeSearchTitle(title: string): string {
  const folded = title.normalize("NFKC").toLocaleLowerCase("pl");
  const words = folded
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (words) return words;
  return folded.replace(/[^\p{Extended_Pictographic}]+/gu, "");
}

function publishedTime(value: string | null): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const time = Date.parse(value);
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
}

/**
 * Collapse near-duplicate search hits, keeping the newest `published_at`.
 * Identity is `episode_group_id` when it is set (even if titles differ).
 * Otherwise it is the normalized title. Rows with neither stay as-is.
 * Same title under two different group ids stays two rows — the group is the identity.
 */
export function dedupeSearchItems<T extends SearchDedupeItem>(items: readonly T[]): T[] {
  const sorted = [...items].sort(
    (a, b) => publishedTime(b.published_at) - publishedTime(a.published_at),
  );
  const seen = new Set<string>();
  const kept: T[] = [];

  for (const item of sorted) {
    const group = item.episode_group_id?.trim() ?? "";
    const titleKey = normalizeSearchTitle(item.title);
    const key = group ? `g:${group}` : titleKey ? `t:${titleKey}` : "";
    if (key) {
      if (seen.has(key)) continue;
      seen.add(key);
    }
    kept.push(item);
  }

  return kept;
}

function findFolded(text: string, needle: string, needleFold: string, from: number): number {
  const last = text.length - needle.length;
  for (let index = from; index <= last; index += 1) {
    if (text.slice(index, index + needle.length).toLocaleLowerCase("pl") === needleFold) {
      return index;
    }
  }
  return -1;
}

/** Split `text` on case-insensitive occurrences of `query`, preserving the original slice. */
export function splitSearchHighlight(text: string, query: string): SearchHighlightPart[] {
  const needle = query.trim();
  if (!needle || !text) return [{ text, match: false }];

  const needleFold = needle.toLocaleLowerCase("pl");
  const parts: SearchHighlightPart[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const found = findFolded(text, needle, needleFold, cursor);
    if (found < 0) {
      parts.push({ text: text.slice(cursor), match: false });
      break;
    }
    if (found > cursor) parts.push({ text: text.slice(cursor, found), match: false });
    parts.push({ text: text.slice(found, found + needle.length), match: true });
    cursor = found + needle.length;
  }

  return parts.filter((part) => part.text.length > 0);
}
