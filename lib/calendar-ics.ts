export type IcsEvent = {
  id: number;
  title: string;
  startsAt: string;
  city: string;
  venue: string;
  ticketUrl?: string | null;
  durationMinutes?: number;
  stampedAt: Date;
};

/** Slot length when the row has no end time. Google and Outlook links use the same value. */
export const DEFAULT_EVENT_DURATION_MINUTES = 120;

export function publicHttpUrl(value: string | null | undefined): string | null {
  const url = value?.trim() ?? "";
  if (url.startsWith("https://") || url.startsWith("http://")) return url;
  return null;
}

/** Start and end of the .ics slot. Null when the start or length is unusable. */
export function eventTimeRange(
  startsAt: string,
  durationMinutes?: number,
): { start: Date; end: Date } | null {
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return null;
  const minutes = durationMinutes ?? DEFAULT_EVENT_DURATION_MINUTES;
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 24 * 60) return null;
  return { start, end: new Date(start.getTime() + minutes * 60_000) };
}

export function formatIcsUtc(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

export function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\n|\r/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  let limit = 75;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (current && bytes + size > limit) {
      parts.push(current);
      current = char;
      bytes = size;
      limit = 74;
    } else {
      current += char;
      bytes += size;
    }
  }
  if (current) parts.push(current);
  return parts.map((part, index) => (index === 0 ? part : ` ${part}`)).join("\r\n");
}

/** One VEVENT. Null when the start instant is not a real date. */
export function buildEventIcs(event: IcsEvent): string | null {
  if (!Number.isSafeInteger(event.id) || event.id <= 0) return null;
  const range = eventTimeRange(event.startsAt, event.durationMinutes);
  if (!range) return null;
  const { start, end } = range;
  const summary = event.title.trim() || "Stand-up";
  const location = [event.venue, event.city].map((part) => part.trim()).filter(Boolean).join(", ");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//parska.pl//trasy//PL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:event-${event.id}@parska.pl`,
    `DTSTAMP:${formatIcsUtc(event.stampedAt)}`,
    `DTSTART:${formatIcsUtc(start)}`,
    `DTEND:${formatIcsUtc(end)}`,
    `SUMMARY:${escapeIcs(summary)}`,
  ];
  if (location) lines.push(`LOCATION:${escapeIcs(location)}`);
  const ticket = publicHttpUrl(event.ticketUrl);
  if (ticket) lines.push(`URL:${ticket}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}
