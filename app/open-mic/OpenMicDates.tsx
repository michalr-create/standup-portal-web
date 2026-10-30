import { formatEventWhen, formatRelativeWhen, terminLabel } from "@/lib/events";
import type { OpenMicCycle, OpenMicDate } from "@/lib/open-mics";
import { ExternalAnchor, focusRing } from "./ui";

export default function OpenMicDates({
  dates,
  cycles,
  now,
  filtered,
}: {
  dates: OpenMicDate[];
  cycles: readonly OpenMicCycle[];
  now: Date;
  filtered: boolean;
}) {
  const byId = new Map(cycles.map((cycle) => [cycle.id, cycle]));

  return (
    <section className="mt-12">
      <div className="mb-4 flex flex-wrap items-baseline gap-4">
        <h2 className="m-0 font-black leading-none" style={{ fontSize: "clamp(24px, 3vw, 32px)", letterSpacing: "-.025em" }}>
          Najbliższe terminy
          <span className="dot-accent">.</span>
        </h2>
        {dates.length > 0 && (
          <span className="mono text-xs uppercase" style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}>
            {dates.length} {terminLabel(dates.length)}
          </span>
        )}
      </div>

      {dates.length === 0 ? (
        <p className="m-0 text-[15px]" style={{ color: "var(--paper-dim)" }}>
          {filtered
            ? "Żaden nadchodzący termin nie pasuje do tych filtrów."
            : "Nie ma jeszcze ogłoszonych terminów. Cykle powyżej zbierają zapisy, a daty pojawią się tu po moderacji."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {dates.map((date) => {
            const cycle = date.open_mic_id == null ? undefined : byId.get(date.open_mic_id);
            const title = date.title || cycle?.name || "Open mic";
            const place = [date.city, date.venue].filter(Boolean).join(" · ");
            const relative = formatRelativeWhen(date.starts_at, now);
            return (
              <article
                key={date.id}
                className="flex flex-col gap-3 rounded-[18px] p-4 sm:flex-row sm:items-center sm:justify-between"
                style={{ border: "1px solid var(--line)", background: "var(--ink-2)" }}
              >
                <div className="min-w-0">
                  <p className="mono m-0 text-xs uppercase" style={{ color: "var(--paper-meta)", letterSpacing: ".08em" }}>
                    {formatEventWhen(date.starts_at)}
                    {relative ? ` · ${relative}` : ""}
                  </p>
                  <h3 className="m-0 mt-1 font-black leading-tight" style={{ fontSize: "18px", letterSpacing: "-.02em" }}>
                    {title}
                  </h3>
                  {place && (
                    <p className="m-0 mt-1 text-sm" style={{ color: "var(--paper-dim)" }}>
                      {place}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {date.status === "sold_out" && (
                    <span
                      className="mono rounded-full px-2.5 py-1 text-xs font-bold uppercase"
                      style={{ color: "var(--paper-dim)", background: "var(--ink-4)", letterSpacing: ".06em" }}
                    >
                      Wyprzedane
                    </span>
                  )}
                  {date.url && (
                    <ExternalAnchor
                      href={date.url}
                      className={`inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full px-4 text-sm font-black sm:w-auto ${focusRing}`}
                      style={{ background: "var(--coral)", color: "var(--ink)" }}
                    >
                      Bilety
                    </ExternalAnchor>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
