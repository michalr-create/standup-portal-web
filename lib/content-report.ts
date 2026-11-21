import { getYouTubeId } from "./youtube.ts";

export const REPORT_DAILY_LIMIT = 10;
export const REPORT_MESSAGE_MAX = 2000;
export const REPORT_URL_MAX = 500;

export const REPORT_KINDS = ["missing_video", "wrong_meta", "new_open_mic"] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];

export const REPORT_STATUSES = ["new", "accepted", "dismissed"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export type ReportDraft = {
  kind: string;
  url?: string | null;
  contentItemId?: number | string | null;
  message?: string | null;
};

export type ReportRow = {
  kind: ReportKind;
  url: string | null;
  contentItemId: number | null;
  message: string;
};

export type ReportDecision = { ok: true; row: ReportRow } | { ok: false; error: string };

const KIND_LABELS: Record<ReportKind, string> = {
  missing_video: "Brakujący film",
  wrong_meta: "Błędny tag, osoba lub format",
  new_open_mic: "Nowy open mic",
};

export function reportKindLabel(kind: string): string {
  return (REPORT_KINDS as readonly string[]).includes(kind) ? KIND_LABELS[kind as ReportKind] : kind;
}

export function reportStatusLabel(status: string): string {
  if (status === "new") return "Nowe";
  if (status === "accepted") return "Przyjęte";
  if (status === "dismissed") return "Odrzucone";
  return status;
}

export function reportLimitReached(countToday: number): boolean {
  return Number.isFinite(countToday) && countToday >= REPORT_DAILY_LIMIT;
}

export function isReportStatus(value: string): value is ReportStatus {
  return (REPORT_STATUSES as readonly string[]).includes(value);
}

function httpUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > REPORT_URL_MAX) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return trimmed;
  } catch {
    return null;
  }
}

function messageOf(raw: string | null | undefined, required: boolean): { value: string } | { error: string } {
  const message = (raw ?? "").trim();
  if (required && !message) return { error: "Napisz, co jest nie tak." };
  if (message.length > REPORT_MESSAGE_MAX) return { error: "Wiadomość może mieć najwyżej 2000 znaków." };
  return { value: message };
}

function positiveId(value: number | string | null | undefined): number | null {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) return value;
  if (typeof value === "string" && /^[1-9]\d*$/.test(value.trim())) {
    const id = Number(value.trim());
    return Number.isSafeInteger(id) ? id : null;
  }
  return null;
}

export function validateContentReport(input: ReportDraft): ReportDecision {
  if (input.kind === "missing_video") {
    const url = httpUrl(input.url ?? "");
    if (!url || !getYouTubeId(url)) {
      return { ok: false, error: "Podaj link do filmu na YouTube." };
    }
    const message = messageOf(input.message, false);
    if ("error" in message) return { ok: false, error: message.error };
    return { ok: true, row: { kind: "missing_video", url, contentItemId: null, message: message.value } };
  }

  if (input.kind === "wrong_meta") {
    const contentItemId = positiveId(input.contentItemId);
    if (contentItemId == null) return { ok: false, error: "Wskaż materiał, którego dotyczy zgłoszenie." };
    const message = messageOf(input.message, true);
    if ("error" in message) return { ok: false, error: message.error };
    return { ok: true, row: { kind: "wrong_meta", url: null, contentItemId, message: message.value } };
  }

  if (input.kind === "new_open_mic") {
    const message = messageOf(input.message, true);
    if ("error" in message) return { ok: false, error: message.error };
    const rawUrl = (input.url ?? "").trim();
    const url = rawUrl ? httpUrl(rawUrl) : null;
    if (rawUrl && !url) return { ok: false, error: "Link do open micu musi zaczynać się od http:// albo https://." };
    return { ok: true, row: { kind: "new_open_mic", url, contentItemId: null, message: message.value } };
  }

  return { ok: false, error: "Wybierz rodzaj zgłoszenia." };
}

function warsawOffsetMinutes(instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Warsaw",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  let hour = read("hour");
  if (hour === 24) hour = 0;
  const asUtc = Date.UTC(read("year"), read("month") - 1, read("day"), hour, read("minute"), read("second"));
  return Math.round((asUtc - instant.getTime()) / 60_000);
}

/** Midnight in Europe/Warsaw, as a UTC instant. Matches the SQL day window. */
export function warsawDayStart(now: Date): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const guess = new Date(Date.UTC(read("year"), read("month") - 1, read("day")));
  const offset = warsawOffsetMinutes(guess);
  const start = new Date(guess.getTime() - offset * 60_000);
  const offsetAtStart = warsawOffsetMinutes(start);
  if (offsetAtStart === offset) return start;
  return new Date(guess.getTime() - offsetAtStart * 60_000);
}
