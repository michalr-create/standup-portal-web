/**
 * Multi-part specials count as one program.
 *
 * Benshi is five approved videos, all with show_id null, titled
 * `Rafał Pacześ - "…" (program BENSHI n/5)`. The series name is the
 * `program NAME n/m` phrase, not show_id. Other parts share a title stem
 * once the marker is removed (`część 1/3`, `cz. I`, `odc. 1`, `Part 1`)
 * or the same short phrase in front of that marker (`Format VHS cz.I`).
 * A shared show_id alone does not merge a format or a festival.
 */

const ROMAN_VALUE: Record<string, number> = {
  i: 1,
  ii: 2,
  iii: 3,
  iv: 4,
  v: 5,
  vi: 6,
  vii: 7,
  viii: 8,
  ix: 9,
  x: 10,
  xi: 11,
  xii: 12,
};

const ROMAN = "xii|xi|x|ix|viii|vii|vi|v|iv|iii|ii|i";
const PART_WORD = "cz\u0119\u015b\u0107|czesc|cz\\.|cz(?=\\s)|odcinek|odc\\.|odc|part|episode|ep\\.";
const PROGRAM_RE = /program\s+([^0-9()[\]{}]{1,40}?)\s+(\d{1,2})\s*\/\s*(\d{1,2})(?!\d)/i;
const WORD_RE = new RegExp(
  `(?:^|[\\s|([{\\-\\u2013\\u2014])(?:${PART_WORD})\\s*(${ROMAN}|\\d{1,2})\\b(?:\\s*/\\s*(\\d{1,2})(?!\\d))?`,
  "i",
);
const FRACTION_RE = /(?:^|[\s|([{\-\u2013\u2014])(\d{1,2})\s*\/\s*(\d{1,2})(?!\d)/;
const HASH_RE = /(?:^|\s)#\s*(\d{1,2})(?!\d)/;
const GENERIC_TOKEN = new Set(["stand", "up", "standup", "video", "full", "hd", "official", "the"]);

export type ProgramFields = {
  id: number;
  title: string;
  showId: number | null;
  publishedAt: string | null;
};

export type ProgramGroup<T> = {
  key: string;
  name: string;
  parts: T[];
};

type PartHit = {
  partNumber: number | null;
  seriesName: string | null;
  primaryKey: string | null;
  anchor: string | null;
};

function fold(value: string): string {
  return value
    .toLocaleLowerCase("pl")
    .replace(/\u0105/g, "a")
    .replace(/\u0107/g, "c")
    .replace(/\u0119/g, "e")
    .replace(/\u0142/g, "l")
    .replace(/\u0144/g, "n")
    .replace(/\u00f3/g, "o")
    .replace(/\u015b/g, "s")
    .replace(/[\u017a\u017c]/g, "z")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function scopeKey(showId: number | null, body: string): string {
  return `${showId == null ? "none" : `show:${showId}`}:${body}`;
}

function validFraction(part: number, total: number): boolean {
  return part >= 1 && total >= 2 && total <= 12 && part <= total;
}

function partToken(token: string): number | null {
  if (/^\d{1,2}$/.test(token)) {
    const value = Number(token);
    return value >= 1 && value <= 30 ? value : null;
  }
  return ROMAN_VALUE[token.toLowerCase()] ?? null;
}

function anchorKey(before: string, showId: number | null): string | null {
  const tokens = fold(before).split(" ").filter((token) => token && !GENERIC_TOKEN.has(token));
  if (tokens.length < 2) return null;
  return scopeKey(showId, `anchor:${tokens.slice(-2).join(" ")}`);
}

function stemKey(title: string, markerStart: number, markerEnd: number, showId: number | null): string | null {
  const stem = fold(`${title.slice(0, markerStart)} ${title.slice(markerEnd)}`);
  if (stem.length < 3) return null;
  return scopeKey(showId, `stem:${stem}`);
}

export function parseProgramPart(title: string, showId: number | null): PartHit {
  const program = PROGRAM_RE.exec(title);
  if (program) {
    const name = program[1]?.trim().replace(/[\s|\u2013\u2014-]+$/g, "") ?? "";
    const part = Number(program[2]);
    const total = Number(program[3]);
    if (name.length >= 2 && validFraction(part, total)) {
      return {
        partNumber: part,
        seriesName: name,
        primaryKey: scopeKey(showId, `program:${fold(name)}`),
        anchor: anchorKey(title.slice(0, program.index), showId),
      };
    }
  }

  const word = WORD_RE.exec(title);
  if (word?.index != null) {
    const part = partToken(word[1] ?? "");
    const total = word[2] ? Number(word[2]) : null;
    const fractionOk = total == null || validFraction(part ?? 0, total);
    if (part != null && fractionOk) {
      const start = word.index + (word[0].length - word[0].trimStart().length);
      return {
        partNumber: part,
        seriesName: null,
        primaryKey: stemKey(title, start, word.index + word[0].length, showId),
        anchor: anchorKey(title.slice(0, start), showId),
      };
    }
  }

  const fraction = FRACTION_RE.exec(title);
  if (fraction) {
    const part = Number(fraction[1]);
    const total = Number(fraction[2]);
    if (validFraction(part, total)) {
      const start = fraction.index + (fraction[0].length - fraction[0].trimStart().length);
      return {
        partNumber: part,
        seriesName: null,
        primaryKey: stemKey(title, start, fraction.index + fraction[0].length, showId),
        anchor: anchorKey(title.slice(0, start), showId),
      };
    }
  }

  const hash = HASH_RE.exec(title);
  if (hash) {
    const part = Number(hash[1]);
    if (part >= 1 && part <= 30) {
      const start = hash.index + (hash[0].length - hash[0].trimStart().length);
      return {
        partNumber: part,
        seriesName: null,
        primaryKey: stemKey(title, start, hash.index + hash[0].length, showId),
        anchor: anchorKey(title.slice(0, start), showId),
      };
    }
  }

  return { partNumber: null, seriesName: null, primaryKey: null, anchor: null };
}

function seriesLabel(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed || /[a-z\u0105\u0107\u0119\u0142\u0144\u00f3\u015b\u017a\u017c]/.test(trimmed)) return trimmed;
  return trimmed
    .toLocaleLowerCase("pl")
    .replace(/(^|[\s-])(\p{L})/gu, (_all, sep: string, ch: string) => sep + ch.toLocaleUpperCase("pl"));
}

function tidy(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/[\s|\u2013\u2014-]+$/g, "")
    .replace(/^[\s|\u2013\u2014-]+/g, "")
    .trim();
}

function fallbackName(titles: string[]): string {
  const stripped = titles
    .map((title) => tidy(title
      .replace(PROGRAM_RE, " ")
      .replace(WORD_RE, " ")
      .replace(FRACTION_RE, " ")
      .replace(HASH_RE, " ")))
    .filter((title) => title.length > 0)
    .sort((a, b) => a.length - b.length || a.localeCompare(b, "pl"));
  return stripped[0] ?? tidy(titles[0] ?? "") ?? "Program";
}

type Row<T> = {
  item: T;
  fields: ProgramFields;
  partNumber: number | null;
  seriesName: string | null;
  primaryKey: string | null;
  anchor: string | null;
};

function compareRows<T>(a: Row<T>, b: Row<T>): number {
  if (a.partNumber != null && b.partNumber != null && a.partNumber !== b.partNumber) {
    return a.partNumber - b.partNumber;
  }
  if (a.partNumber != null && b.partNumber == null) return -1;
  if (a.partNumber == null && b.partNumber != null) return 1;
  const left = a.fields.publishedAt ?? "";
  const right = b.fields.publishedAt ?? "";
  if (left !== right) {
    if (!left) return 1;
    if (!right) return -1;
    return left < right ? -1 : 1;
  }
  return a.fields.id - b.fields.id;
}

/** One group per program. Input order is the order of groups (newest-first lists stay newest-first). Parts inside a group run from part 1 upward, then by published_at. */
export function collapseBy<T>(
  items: readonly T[],
  read: (item: T) => ProgramFields,
): ProgramGroup<T>[] {
  const rows: Row<T>[] = items.map((item) => {
    const fields = read(item);
    const parsed = parseProgramPart(fields.title, fields.showId);
    return { item, fields, ...parsed };
  });

  const primaryCounts = new Map<string, number>();
  const anchorCounts = new Map<string, number>();
  for (const row of rows) {
    if (row.primaryKey) primaryCounts.set(row.primaryKey, (primaryCounts.get(row.primaryKey) ?? 0) + 1);
    if (row.anchor) anchorCounts.set(row.anchor, (anchorCounts.get(row.anchor) ?? 0) + 1);
  }

  const groups = new Map<string, Row<T>[]>();
  const order: string[] = [];
  for (const row of rows) {
    let key = `item:${row.fields.id}`;
    if (row.primaryKey && (primaryCounts.get(row.primaryKey) ?? 0) > 1) key = row.primaryKey;
    else if (row.anchor && (anchorCounts.get(row.anchor) ?? 0) > 1) key = row.anchor;
    let list = groups.get(key);
    if (!list) {
      list = [];
      groups.set(key, list);
      order.push(key);
    }
    list.push(row);
  }

  return order.map((key) => {
    const list = groups.get(key) ?? [];
    const sorted = [...list].sort(compareRows);
    const series = list.find((row) => row.seriesName)?.seriesName ?? null;
    return {
      key,
      name: series ? seriesLabel(series) : fallbackName(sorted.map((row) => row.fields.title)),
      parts: sorted.map((row) => row.item),
    };
  });
}
