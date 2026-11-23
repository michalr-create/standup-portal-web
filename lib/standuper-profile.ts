/**
 * Counts on a standuper profile describe the cards on the page:
 * video cards in the category rows, plus format show cards.
 * Episodes that only appear inside a format card are not counted again.
 * Nostalgia repeats old specials, so those cards are not added a second time.
 */
import { isNostalgiaCandidate } from "./nostalgia.ts";

/** Cards rendered in one profile carousel. The rest stay behind „Pokaż wszystkie”. */
export const PROFILE_ROW_LIMIT = 12;

function isPolishFew(n: number): boolean {
  return n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 > 20);
}

export function materialLabel(n: number): string {
  if (n === 1) return "materia\u0142";
  if (isPolishFew(n)) return "materia\u0142y";
  return "materia\u0142\u00f3w";
}

export function formatLabel(n: number): string {
  if (n === 1) return "format";
  if (isPolishFew(n)) return "formaty";
  return "format\u00f3w";
}

/** "12 materia\u0142\u00f3w \u00b7 2 formaty". Omits a side that has nothing to show. */
export function profileCountLabel(videos: number, formats: number): string {
  const parts: string[] = [];
  if (videos > 0) parts.push(`${videos} ${materialLabel(videos)}`);
  if (formats > 0) parts.push(`${formats} ${formatLabel(formats)}`);
  if (parts.length === 0) return `0 ${materialLabel(0)}`;
  return parts.join(" \u00b7 ");
}

function publishedMs(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

/** Newest publication first. Missing or invalid dates stay at the end, in original order. */
export function sortByDateDesc<T>(items: readonly T[], dateOf: (item: T) => string | null): T[] {
  return [...items].sort((a, b) => {
    const at = publishedMs(dateOf(a));
    const bt = publishedMs(dateOf(b));
    if (at != null && bt != null && at !== bt) return bt - at;
    if (at != null && bt == null) return -1;
    if (at == null && bt != null) return 1;
    return 0;
  });
}

/** "Trasy (12)". Nothing to link when there are no upcoming shows. */
export function profileTourLabel(count: number): string | null {
  if (!Number.isFinite(count) || count <= 0) return null;
  return `Trasy (${Math.floor(count)})`;
}

export type ProfileShelfItem = {
  id: number;
  published_at: string | null;
  show_id: number | null;
  categorySlug: string | null;
  categoryName: string | null;
  duration_seconds: number | null;
  tags: readonly { slug: string }[];
};

const SECTION_ORDER = [
  "special",
  "standup",
  "formaty",
  "wywiady",
  "kulisy",
  "roast",
  "shorts",
  "nostalgia",
] as const;

type KnownSection = (typeof SECTION_ORDER)[number];

const KNOWN_SECTIONS = new Set<string>(SECTION_ORDER);

/** Site labels. Specjale is the "special" tag, not a category name from the database. */
const SECTION_LABEL: Record<KnownSection, string> = {
  special: "Specjale",
  standup: "Standup",
  formaty: "Formaty",
  wywiady: "Wywiady",
  kulisy: "Kulisy",
  roast: "Roast",
  shorts: "Shorts",
  nostalgia: "Nostalgia",
};

/**
 * Listings that accept ?osoba= (UX-48). /formaty is a show index and
 * /nostalgia is a daily shelf, so those rows have no filtered "show all".
 */
const SECTION_LISTING: Record<KnownSection, string | null> = {
  special: "/specjale",
  standup: "/standup",
  formaty: null,
  wywiady: "/wywiady",
  kulisy: "/kulisy",
  roast: "/roast",
  shorts: "/shorts",
  nostalgia: null,
};

export type ProfileVideoBlock<T> = {
  kind: "videos";
  key: string;
  label: string;
  listingPath: string | null;
  items: T[];
  total: number;
};

export type ProfileFormatBlock<T, S> = {
  kind: "formaty";
  key: "formaty";
  label: "Formaty";
  listingPath: null;
  items: T[];
  total: number;
  shows: S[];
};

export type ProfileBlock<T, S> = ProfileVideoBlock<T> | ProfileFormatBlock<T, S>;

function sectionKey(item: ProfileShelfItem): string {
  if (item.tags.some((tag) => tag.slug === "special")) return "special";
  const slug = item.categorySlug?.trim();
  return slug || "inne";
}

function isShelfNostalgia(item: ProfileShelfItem, now: Date): boolean {
  if (item.categorySlug === "shorts") return false;
  if (!item.tags.some((tag) => tag.slug === "special")) return false;
  return isNostalgiaCandidate(
    { publishedAt: item.published_at, durationSeconds: item.duration_seconds },
    now,
  );
}

function takeNewest<T extends ProfileShelfItem>(items: readonly T[], limit: number): T[] {
  return sortByDateDesc(items, (item) => item.published_at).slice(0, limit);
}

function videoBlock<T extends ProfileShelfItem>(
  key: string,
  label: string,
  listingPath: string | null,
  all: readonly T[],
  items: T[],
): ProfileVideoBlock<T> | null {
  if (all.length === 0 || items.length === 0) return null;
  return { kind: "videos", key, label, listingPath, items, total: all.length };
}

/**
 * One carousel per category that actually has cards, newest first.
 * Specials win over the item's category. Episodes of a format this person
 * hosts stay on the format card and are left out of the video rows.
 * Nostalgia is the old specials that did not already fit on the Specjale row.
 */
export function buildProfileBlocks<T extends ProfileShelfItem, S>(
  items: readonly T[],
  shows: readonly S[],
  options: {
    now: Date;
    defaultShowIds: ReadonlySet<number>;
    showDate: (show: S) => string | null;
    rowLimit?: number;
  },
): ProfileBlock<T, S>[] {
  const requested = options.rowLimit ?? PROFILE_ROW_LIMIT;
  const rowLimit = Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : PROFILE_ROW_LIMIT;
  const visible = items.filter((item) => item.show_id == null || !options.defaultShowIds.has(item.show_id));

  const groups = new Map<string, T[]>();
  const labels = new Map<string, string>();
  for (const item of visible) {
    const key = sectionKey(item);
    const list = groups.get(key);
    if (list) list.push(item);
    else groups.set(key, [item]);
    if (!KNOWN_SECTIONS.has(key) && key !== "inne" && !labels.has(key)) {
      const name = item.categoryName?.trim();
      if (name) labels.set(key, name);
    }
  }

  const specials = groups.get("special") ?? [];
  const specjaleItems = takeNewest(specials, rowLimit);
  const shownSpecials = new Set(specjaleItems.map((item) => item.id));
  const nostalgiaAll = sortByDateDesc(
    visible.filter((item) => isShelfNostalgia(item, options.now)),
    (item) => item.published_at,
  );
  const nostalgiaRest = nostalgiaAll.filter((item) => !shownSpecials.has(item.id));
  const orderedShows = sortByDateDesc([...shows], options.showDate);
  const blocks: ProfileBlock<T, S>[] = [];

  for (const key of SECTION_ORDER) {
    if (key === "formaty") {
      const all = groups.get("formaty") ?? [];
      if (all.length === 0 && orderedShows.length === 0) continue;
      blocks.push({
        kind: "formaty",
        key: "formaty",
        label: "Formaty",
        listingPath: null,
        items: takeNewest(all, rowLimit),
        total: all.length,
        shows: orderedShows,
      });
      continue;
    }
    if (key === "nostalgia") {
      const block = videoBlock(
        "nostalgia",
        SECTION_LABEL.nostalgia,
        null,
        nostalgiaRest,
        nostalgiaRest.slice(0, rowLimit),
      );
      if (block) blocks.push(block);
      continue;
    }
    const all = groups.get(key) ?? [];
    const row = key === "special" ? specjaleItems : takeNewest(all, rowLimit);
    const block = videoBlock(key, SECTION_LABEL[key], SECTION_LISTING[key], all, row);
    if (block) blocks.push(block);
  }

  const extras = [...groups.keys()]
    .filter((key) => !KNOWN_SECTIONS.has(key))
    .sort((a, b) => (labels.get(a) || "Inne").localeCompare(labels.get(b) || "Inne", "pl") || a.localeCompare(b));
  for (const key of extras) {
    const all = groups.get(key) ?? [];
    const block = videoBlock(key, labels.get(key) || "Inne", null, all, takeNewest(all, rowLimit));
    if (block) blocks.push(block);
  }

  return blocks;
}

/** Header total. Nostalgia cards are specials that were already counted. */
export function profileVideoCount<T extends ProfileShelfItem, S>(blocks: readonly ProfileBlock<T, S>[]): number {
  return blocks.reduce((sum, block) => (block.key === "nostalgia" ? sum : sum + block.total), 0);
}
