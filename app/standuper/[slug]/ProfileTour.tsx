import Link from "next/link";
import {
  formatEventWhen,
  formatPrice,
  formatRelativeWhen,
  trasyHref,
  type TourEvent,
} from "@/lib/events";
import { paidExternalUrl } from "@/lib/youtube";

function ExternalIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

function TicketCta({ event }: { event: TourEvent }) {
  const href = paidExternalUrl(event.ticket_url);
  if (!href) return null;
  const soldOut = event.status === "sold_out";
  const label = soldOut ? "Wyprzedane" : "Bilety";
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-black transition-colors hover:bg-[rgba(232,89,74,.16)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]"
      style={
        soldOut
          ? { color: "var(--paper-dim)", border: "1px solid var(--line-2)" }
          : { color: "var(--coral)", border: "1px solid var(--coral)" }
      }
    >
      {label}
      <ExternalIcon />
      <span className="sr-only">, otwiera si{"\u0119"} w nowej karcie</span>
    </a>
  );
}

function TourRow({ event, now }: { event: TourEvent; now: Date }) {
  const relative = formatRelativeWhen(event.starts_at, now);
  const price = formatPrice(event.price_from, event.currency);

  return (
    <li
      className="flex flex-col gap-3 rounded-[18px] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      style={{ border: "1px solid var(--line)", background: "var(--ink-2)" }}
    >
      <div className="min-w-0">
        <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1">
          <time
            dateTime={event.starts_at}
            className="mono text-xs uppercase"
            style={{ color: "var(--paper-meta)", letterSpacing: ".06em" }}
          >
            {formatEventWhen(event.starts_at)}
          </time>
          {relative && (
            <span
              className="mono shrink-0 rounded-full px-2 py-0.5 text-xs"
              style={{
                color: "var(--paper-mute)",
                background: "var(--ink-4)",
                letterSpacing: ".04em",
              }}
            >
              {relative}
            </span>
          )}
        </p>
        <p className="m-0 mt-1" style={{ color: "var(--paper)" }}>
          {event.city}
          <span style={{ color: "var(--paper-meta)" }}>{" \u00b7 "}</span>
          {event.venue}
        </p>
        {price && (
          <p className="mono m-0 mt-1 text-xs uppercase" style={{ color: "var(--paper-dim)", letterSpacing: ".06em" }}>
            {price}
          </p>
        )}
      </div>
      <div className="sm:shrink-0">
        <TicketCta event={event} />
      </div>
    </li>
  );
}

export default function ProfileTour({
  slug,
  events,
  now,
}: {
  slug: string;
  events: TourEvent[];
  now: Date;
}) {
  if (events.length === 0) return null;

  return (
    <section className="mb-14" aria-labelledby="trasa-profil">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <h2
          id="trasa-profil"
          className="m-0 font-black leading-none"
          style={{ fontSize: "clamp(22px, 3vw, 30px)", letterSpacing: "-.02em" }}
        >
          Trasa
          <span className="dot-accent">.</span>
        </h2>
        <Link
          href={trasyHref({ osoba: slug })}
          className="text-sm font-bold transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]"
          style={{ color: "var(--coral)" }}
        >
          {"Wszystkie terminy \u2192"}
        </Link>
      </div>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {events.map((event) => (
          <TourRow key={event.id} event={event} now={now} />
        ))}
      </ul>
    </section>
  );
}
