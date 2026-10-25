/**
 * Chip order for the Standup category filter.
 * There is no tags.display_order column — this is display-only.
 *
 * 1. Special (`special`, name fallback `specjal` / `specials`)
 * 2. Stand-up impro (`stand-up-impro` and close slug variants)
 * 3. klipy (`klipy`, name fallback `klip`)
 * 4. Every other tag, Polish alphabetical by stored name (the previous chip sort)
 *
 * Slug is checked first. Name is used only when the slug is not one of these.
 */

export type TagChipIdentity = {
  slug: string;
  name: string;
};

const SPECIAL_KEYS = new Set(["special", "specjal", "specials"]);
const IMPRO_KEYS = new Set([
  "stand-up-impro",
  "standup-impro",
  "stand-up-improv",
  "standup-improv",
]);
const KLIPY_KEYS = new Set(["klipy", "klip"]);

const PREFERRED_KEYS = [SPECIAL_KEYS, IMPRO_KEYS, KLIPY_KEYS];

export function normalizeTagChipKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function rankForKey(key: string): number | null {
  if (!key) return null;
  for (let i = 0; i < PREFERRED_KEYS.length; i++) {
    if (PREFERRED_KEYS[i].has(key)) return i;
  }
  return null;
}

/** 0 Special, 1 Stand-up impro, 2 klipy, 3 the rest. */
export function standupTagChipRank(tag: TagChipIdentity): number {
  const slugRank = rankForKey(normalizeTagChipKey(tag.slug));
  if (slugRank !== null) return slugRank;
  const nameRank = rankForKey(normalizeTagChipKey(tag.name));
  if (nameRank !== null) return nameRank;
  return PREFERRED_KEYS.length;
}

export function sortStandupTagChips<T extends TagChipIdentity>(tags: readonly T[]): T[] {
  return [...tags].sort((a, b) => {
    const rankDiff = standupTagChipRank(a) - standupTagChipRank(b);
    if (rankDiff !== 0) return rankDiff;
    return a.name.localeCompare(b.name, "pl");
  });
}
