const NBSP = "\u00a0";

/** 1 → one, 2–4 → few, 5+ and teens → many. `n` is treated as a whole number. */
export function polishCount(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(Math.floor(n));
  if (abs === 1) return one;
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

function groupInt(value: number): string {
  return String(Math.trunc(Math.abs(value))).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

function formatRounded(rounded: number, unit: string): string {
  const whole = Math.trunc(rounded);
  const tenth = Math.round((rounded - whole) * 10);
  if (tenth <= 0) return `${groupInt(whole)} ${unit}`;
  return `${groupInt(whole)},${tenth} ${unit}`;
}

/**
 * Compact Polish view total: `999`, `1,2 tys.`, `1,2 mln`, `1,2 mld`.
 * Thousands use a narrow grouping space. Invalid and negative values are empty.
 */
export function formatViewCount(count: number): string {
  if (!Number.isFinite(count) || count < 0) return "";
  const n = Math.floor(count);
  if (n < 1000) return groupInt(n);

  let divisor = 1000;
  let unit = "tys.";
  if (n >= 1_000_000) {
    divisor = 1_000_000;
    unit = "mln";
  }
  if (n >= 1_000_000_000) {
    divisor = 1_000_000_000;
    unit = "mld";
  }

  let rounded = Math.round((n / divisor) * 10) / 10;
  if (rounded >= 1000) {
    divisor *= 1000;
    rounded = Math.round((n / divisor) * 10) / 10;
    unit = divisor >= 1_000_000_000 ? "mld" : "mln";
  }
  return formatRounded(rounded, unit);
}

export function viewsNoun(count: number): string {
  if (count >= 1000) return "wy\u015bwietle\u0144";
  return polishCount(Math.floor(count), "wy\u015bwietlenie", "wy\u015bwietlenia", "wy\u015bwietle\u0144");
}

/** `1,2 mln wyświetleń` / `1 wyświetlenie`. */
export function formatViews(count: number): string {
  const label = formatViewCount(count);
  if (!label) return "";
  return `${label} ${viewsNoun(count)}`;
}

/** Absolute gain, always with a sign. `+1,2 mln`. */
export function formatGain(gain: number): string {
  if (!Number.isFinite(gain)) return "";
  if (gain === 0) return formatViewCount(0);
  const sign = gain > 0 ? "+" : "\u2212";
  return sign + formatViewCount(Math.abs(gain));
}

/** `+3,4%` under 10, otherwise a whole percent. `+1 240%`. */
export function formatGainPct(pct: number): string {
  if (!Number.isFinite(pct)) return "";
  const sign = pct > 0 ? "+" : pct < 0 ? "\u2212" : "";
  const abs = Math.abs(pct);
  const rounded = abs >= 10 ? Math.round(abs) : Math.round(abs * 10) / 10;
  const whole = Math.trunc(rounded);
  const tenth = Math.round((rounded - whole) * 10);
  const text = tenth <= 0 ? groupInt(whole) : `${groupInt(whole)},${tenth}`;
  return `${sign}${text}%`;
}

export function programLabel(n: number): string {
  return polishCount(n, "program", "programy", "program\u00f3w");
}

export function odcinekLabel(n: number): string {
  return polishCount(n, "odcinek", "odcinki", "odcink\u00f3w");
}
