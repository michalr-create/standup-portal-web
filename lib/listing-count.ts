export type CountWord = {
  one: string;
  /** 2–4, 22–24, … When omitted, those numbers keep `many` (older listings). */
  few?: string;
  many: string;
};

const WYNIK: CountWord = { one: "wynik", few: "wyniki", many: "wynik\u00f3w" };

function polishForm(n: number, word: CountWord, full: boolean): string {
  const abs = Math.abs(Math.trunc(Number.isFinite(n) ? n : 0));
  if (!full) return abs === 1 ? word.one : word.many;
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return word.one;
  if (word.few && mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return word.few;
  return word.many;
}

/**
 * Unfiltered listings keep their noun (`330 specjali`, `2 specjale`).
 * An active server filter counts the whole match set as `N wynik/wyniki/wyników`.
 */
export function listingCountLabel(options: {
  catalogTotal?: number;
  shown: number;
  inView: number;
  word: CountWord;
  filtered: boolean;
  server: boolean;
}): string {
  const { catalogTotal, shown, inView, word, filtered, server } = options;
  const full = Boolean(word.few);
  if (server && catalogTotal != null) {
    if (filtered) return `${catalogTotal} ${polishForm(catalogTotal, WYNIK, true)}`;
    return `${catalogTotal} ${polishForm(catalogTotal, word, full)}`;
  }
  if (catalogTotal != null && !filtered) {
    return `${catalogTotal} ${polishForm(catalogTotal, word, full)}`;
  }
  const label = polishForm(shown, word, full);
  if (filtered) {
    return catalogTotal != null
      ? `${shown} z ${inView} ${label} na tej stronie`
      : `${shown} z ${inView} ${label}`;
  }
  return `${shown} ${label}`;
}
