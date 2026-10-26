/** Polish `month: "short"` abbreviations (pl-PL), without a trailing dot. */
const PL_MONTHS_SHORT = [
  "sty",
  "lut",
  "mar",
  "kwi",
  "maj",
  "cze",
  "lip",
  "sie",
  "wrz",
  "pa\u017a",
  "lis",
  "gru",
] as const;

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/**
 * Card duration. Under an hour: `M:SS`. An hour or more: `H:MM:SS`.
 * `null` / invalid → empty string so the badge stays hidden.
 */
export function formatDuration(seconds: number | null): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  const ss = String(s).padStart(2, "0");
  if (h >= 1) return `${h}:${String(m).padStart(2, "0")}:${ss}`;
  return `${m}:${ss}`;
}

function formatCardDate(date: Date, now: Date): string {
  const label = `${date.getDate()} ${PL_MONTHS_SHORT[date.getMonth()]}`;
  if (date.getFullYear() !== now.getFullYear()) return `${label} ${date.getFullYear()}`;
  return label;
}

/**
 * One card style for home, listings, and favorites:
 * `teraz` / `Nh` / `wczoraj` / `Nd` / `D MMM`, and `D MMM YYYY`
 * when the calendar year is not the current one.
 * `now` is injectable so tests can pin the clock.
 */
export function timeAgo(iso: string | null, now: number = Date.now()): string {
  if (!iso) return "";
  const date = new Date(iso);
  const published = date.getTime();
  if (Number.isNaN(published)) return "";

  const diff = now - published;
  if (diff >= 0) {
    const hours = Math.floor(diff / HOUR_MS);
    if (hours < 1) return "teraz";
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(diff / DAY_MS);
    if (days === 1) return "wczoraj";
    if (days < 7) return `${days}d`;
  }

  return formatCardDate(date, new Date(now));
}
