/**
 * Counts on a standuper profile describe the cards on the page:
 * video cards in the section grids, plus format show cards.
 * Episodes that only appear inside a format card are not counted again.
 */

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
