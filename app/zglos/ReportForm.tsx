"use client";

import { useState } from "react";
import Link from "next/link";
import { submitContentReport } from "./actions";
import { REPORT_KINDS, reportKindLabel, type ReportKind } from "@/lib/content-report";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]";

const fieldClass = `min-h-11 w-full rounded-[10px] px-3 text-sm font-semibold ${focusRing}`;

function isKind(value: string): value is ReportKind {
  return (REPORT_KINDS as readonly string[]).includes(value);
}

function linkLabel(kind: ReportKind): string {
  if (kind === "missing_video") return "Link YouTube";
  if (kind === "missing_event") return "Link do biletów albo strony, jeśli jest";
  return "Link, jeśli jest";
}

function messageLabel(kind: ReportKind): string {
  if (kind === "missing_video") return "Dopisek, opcjonalnie";
  if (kind === "missing_event") return "Kto, gdzie i kiedy";
  if (kind === "missing_person") return "Kogo brakuje";
  if (kind === "new_open_mic") return "Gdzie i kiedy";
  return "Co zgłaszasz";
}

export default function ReportForm({
  initialKind,
  contentItemId,
  returnPath,
  kinds = REPORT_KINDS,
}: {
  initialKind: ReportKind;
  contentItemId: number | null;
  returnPath: string;
  kinds?: readonly ReportKind[];
}) {
  const allowed = kinds.length > 0 ? kinds : REPORT_KINDS;
  const [kind, setKind] = useState<ReportKind>(allowed.includes(initialKind) ? initialKind : allowed[0]);
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await submitContentReport({
      kind,
      url,
      message,
      contentItemId: kind === "wrong_meta" ? contentItemId : null,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <p role="status" className="m-0 text-[16px] font-semibold" style={{ color: "var(--paper)" }}>
        Zgłoszenie zapisane. Dzięki.
      </p>
    );
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="flex max-w-xl flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="mono text-xs uppercase" style={{ color: "var(--paper-mute)", letterSpacing: ".14em" }}>
          Rodzaj
        </span>
        <select
          className={fieldClass}
          style={{ color: "var(--paper)", background: "var(--ink-3)", border: "1px solid var(--line-2)" }}
          value={kind}
          onChange={(event) => {
            if (isKind(event.target.value) && allowed.includes(event.target.value)) setKind(event.target.value);
          }}
        >
          {allowed.map((value) => (
            <option key={value} value={value}>
              {reportKindLabel(value)}
            </option>
          ))}
        </select>
      </label>

      {kind === "wrong_meta" && (
        <p className="m-0 text-sm" style={{ color: "var(--paper-dim)" }}>
          {contentItemId
            ? `Materiał nr ${contentItemId}. Napisz, który tag, osoba albo format jest źle.`
            : "Otwórz zgłoszenie z karty materiału, żeby wskazać film."}
        </p>
      )}

      {kind !== "wrong_meta" && (
        <label className="flex flex-col gap-1.5">
          <span className="mono text-xs uppercase" style={{ color: "var(--paper-mute)", letterSpacing: ".14em" }}>
            {linkLabel(kind)}
          </span>
          <input
            type="url"
            inputMode="url"
            required={kind === "missing_video"}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            className={fieldClass}
            style={{ color: "var(--paper)", background: "var(--ink-3)", border: "1px solid var(--line-2)" }}
            placeholder={kind === "missing_video" ? "https://www.youtube.com/watch?v=…" : "https://"}
          />
        </label>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="mono text-xs uppercase" style={{ color: "var(--paper-mute)", letterSpacing: ".14em" }}>
          {messageLabel(kind)}
        </span>
        <textarea
          required={kind !== "missing_video"}
          maxLength={2000}
          rows={5}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className={`w-full rounded-[10px] px-3 py-3 text-sm font-semibold ${focusRing}`}
          style={{ color: "var(--paper)", background: "var(--ink-3)", border: "1px solid var(--line-2)" }}
        />
      </label>

      {error && (
        <p role="alert" className="m-0 text-sm font-semibold" style={{ color: "var(--coral)" }}>
          {error}{" "}
          {error.startsWith("Zaloguj") && (
            <Link href={`/zaloguj?next=${encodeURIComponent(returnPath)}`} className={`font-black ${focusRing}`} style={{ color: "var(--coral)" }}>
              Zaloguj się
            </Link>
          )}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || (kind === "wrong_meta" && contentItemId == null)}
        className={`inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-black ${focusRing} disabled:opacity-50`}
        style={{ background: "var(--coral)", color: "var(--ink)" }}
      >
        {pending ? "Wysyłam…" : "Wyślij zgłoszenie"}
      </button>
    </form>
  );
}
