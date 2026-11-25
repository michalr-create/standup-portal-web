import { eventTimeRange, formatIcsUtc, publicHttpUrl } from "./calendar-ics.ts";

export type CalendarEventInput = {
  id: number;
  title?: string | null;
  startsAt: string;
  city?: string | null;
  venue?: string | null;
  ticketUrl?: string | null;
  durationMinutes?: number;
};

export type CalendarLinks = {
  google: string | null;
  outlook: string | null;
  ics: string | null;
};

/** Same title the .ics route hands to buildEventIcs. */
export function calendarSummary(event: {
  title?: string | null;
  city?: string | null;
  venue?: string | null;
}): string {
  const title = typeof event.title === "string" && event.title.trim() ? event.title : `${event.city ?? ""}: ${event.venue ?? ""}`;
  return title.trim() || "Stand-up";
}

export function calendarLocation(venue?: string | null, city?: string | null): string {
  return [venue ?? "", city ?? ""].map((part) => part.trim()).filter(Boolean).join(", ");
}

/** Ticket link, when it is http(s), then the public event page. */
export function calendarDetails(id: number, ticketUrl?: string | null): string {
  const page = `https://parska.pl/wystep/${id}`;
  const ticket = publicHttpUrl(ticketUrl);
  return ticket ? `${ticket}\n${page}` : page;
}

export function calendarIcsPath(id: number): string | null {
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  return `/api/wydarzenia/${id}/kalendarz`;
}

function enc(value: string): string {
  return encodeURIComponent(value);
}

export function calendarLinks(event: CalendarEventInput): CalendarLinks {
  const ics = calendarIcsPath(event.id);
  const range = eventTimeRange(event.startsAt, event.durationMinutes);
  if (!ics || !range) return { google: null, outlook: null, ics };
  const summary = calendarSummary(event);
  const location = calendarLocation(event.venue, event.city);
  const details = calendarDetails(event.id, event.ticketUrl);
  const dates = `${formatIcsUtc(range.start)}/${formatIcsUtc(range.end)}`;
  const google = [
    "action=TEMPLATE",
    `text=${enc(summary)}`,
    `dates=${dates}`,
    `details=${enc(details)}`,
    ...(location ? [`location=${enc(location)}`] : []),
  ].join("&");
  const outlook = [
    `subject=${enc(summary)}`,
    `startdt=${enc(range.start.toISOString())}`,
    `enddt=${enc(range.end.toISOString())}`,
    `body=${enc(details)}`,
    ...(location ? [`location=${enc(location)}`] : []),
  ].join("&");
  return {
    google: `https://calendar.google.com/calendar/render?${google}`,
    outlook: `https://outlook.live.com/calendar/0/action/compose?${outlook}`,
    ics,
  };
}
