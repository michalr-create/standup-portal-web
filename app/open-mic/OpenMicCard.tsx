import type { ReactNode } from "react";
import { formatEventWhen, formatRelativeWhen } from "@/lib/events";
import {
  languageBadge,
  mapsSearchHref,
  type OpenMicCycle,
  type OpenMicDate,
} from "@/lib/open-mics";
import { ExternalAnchor, focusRing } from "./ui";

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="mono m-0 text-xs uppercase" style={{ color: "var(--paper-mute)", letterSpacing: ".14em" }}>
        {label}
      </p>
      <div className="mt-1 text-[15px] leading-snug" style={{ color: "var(--paper)" }}>
        {children}
      </div>
    </div>
  );
}

export default function OpenMicCard({
  cycle,
  next,
  now,
}: {
  cycle: OpenMicCycle;
  next: OpenMicDate | null;
  now: Date;
}) {
  const badge = languageBadge(cycle.language);
  const maps = mapsSearchHref(cycle);
  const when = next ? formatEventWhen(next.starts_at) : null;
  const relative = next ? formatRelativeWhen(next.starts_at, now) : null;
  const soldOut = next?.status === "sold_out";
  const ticket = next?.url ?? null;

  return (
    <article
      className="flex flex-col gap-4 rounded-[18px] p-4 sm:p-5"
      style={{ border: "1px solid var(--line)", background: "var(--ink-2)" }}
    >
      <div className="flex flex-wrap items-center gap-2">
        {badge && (
          <span
            className="mono rounded-full px-2.5 py-1 text-xs font-bold uppercase"
            style={{ color: "var(--ink)", background: "var(--paper)", letterSpacing: ".06em" }}
          >
            {badge}
          </span>
        )}
        {cycle.status === "to_verify" && (
          <span
            className="mono rounded-full px-2.5 py-1 text-xs font-bold uppercase"
            style={{ color: "var(--paper)", border: "1px solid var(--line-2)", letterSpacing: ".06em" }}
          >
            do potwierdzenia
          </span>
        )}
        {soldOut && (
          <span
            className="mono rounded-full px-2.5 py-1 text-xs font-bold uppercase"
            style={{ color: "var(--paper-dim)", background: "var(--ink-4)", letterSpacing: ".06em" }}
          >
            Wyprzedane
          </span>
        )}
      </div>

      <div>
        <h2 className="m-0 font-black leading-tight" style={{ fontSize: "clamp(22px, 5vw, 28px)", letterSpacing: "-.03em" }}>
          {cycle.name}
        </h2>
        {cycle.venue && (
          <p className="m-0 mt-1 text-[15px] font-bold" style={{ color: "var(--paper-dim)" }}>
            {cycle.venue}
          </p>
        )}
      </div>

      <div className="grid gap-4">
        {(cycle.address || cycle.city) && (
          <Meta label="Adres">
            {maps ? (
              <ExternalAnchor href={maps} className={`inline-flex flex-wrap items-center gap-1.5 font-bold hover:text-white ${focusRing}`}>
                {[cycle.address, cycle.city].filter(Boolean).join(", ")}
              </ExternalAnchor>
            ) : (
              [cycle.address, cycle.city].filter(Boolean).join(", ")
            )}
          </Meta>
        )}

        <Meta label="Kiedy">
          {cycle.recurrence_text && <p className="m-0">{cycle.recurrence_text}</p>}
          {when && (
            <p className="m-0 mt-1" style={{ color: "var(--paper-dim)" }}>
              Najbliżej: {when}
              {relative ? ` · ${relative}` : ""}
            </p>
          )}
          {!cycle.recurrence_text && !when && <p className="m-0">Termin do potwierdzenia</p>}
        </Meta>

        {(cycle.signup_info || cycle.signup_url) && (
          <Meta label="Zapisy">
            {cycle.signup_info && <p className="m-0">{cycle.signup_info}</p>}
            {cycle.signup_url && (
              <p className="m-0 mt-1">
                <ExternalAnchor
                  href={cycle.signup_url}
                  className={`inline-flex min-h-11 items-center gap-1.5 font-black hover:text-white ${focusRing}`}
                >
                  Otwórz zapisy
                </ExternalAnchor>
              </p>
            )}
          </Meta>
        )}

        {cycle.audience_price_text && <Meta label="Dla widzów">{cycle.audience_price_text}</Meta>}
      </div>

      {ticket && (
        <div className="mt-auto">
          <ExternalAnchor
            href={ticket}
            className={`inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full px-4 text-sm font-black sm:w-auto ${focusRing}`}
            style={{ background: "var(--coral)", color: "var(--ink)" }}
          >
            Bilety
          </ExternalAnchor>
        </div>
      )}
    </article>
  );
}
