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

export function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\n|\r/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function formatUtc(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
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
  const start = new Date(event.startsAt);
  if (Number.isNaN(start.getTime())) return null;
  const minutes = event.durationMinutes ?? 120;
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 24 * 60) return null;
  const end = new Date(start.getTime() + minutes * 60_000);
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
    `DTSTAMP:${formatUtc(event.stampedAt)}`,
    `DTSTART:${formatUtc(start)}`,
    `DTEND:${formatUtc(end)}`,
    `SUMMARY:${escapeIcs(summary)}`,
  ];
  if (location) lines.push(`LOCATION:${escapeIcs(location)}`);
  const ticket = event.ticketUrl?.trim() ?? "";
  if (ticket.startsWith("https://") || ticket.startsWith("http://")) lines.push(`URL:${ticket}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}
