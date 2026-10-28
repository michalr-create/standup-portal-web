"use client";

import Link from "next/link";
import {
  eventPeople,
  formatEventWhen,
  standuperProfileHref,
  trasyHref,
  type FavoriteUpcomingEvent,
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

function TicketCta({ event }: { event: FavoriteUpcomingEvent }) {
  const href = paidExternalUrl(event.ticket_url);
  if (!href) return null;
  const soldOut = event.status === "sold_out";
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
      {soldOut ? "Wyprzedane" : "Bilety"}
      <ExternalIcon />
      <span className="sr-only">, otwiera się w nowej karcie</span>
    </a>
  );
}

export default function FavoriteTours({
  loading,
  events,
}: {
  loading: boolean;
  events: FavoriteUpcomingEvent[];
}) {
  const showList = events.length > 0;
  const showEmpty = !loading && !showList;

  return (
    <section className="mb-10" aria-labelledby="graja-wkrotce" aria-busy={loading}>
      <h2
        id="graja-wkrotce"
        className="font-black mb-4"
        style={{ fontSize: "18px", letterSpacing: "-.01em" }}
      >
        Grają wkrótce
        <span className="dot-accent">.</span>
      </h2>
      {loading && !showList && (
        <p className="m-0 text-sm" style={{ color: "var(--paper-mute)" }}>
          Ładowanie…
        </p>
      )}
      {showEmpty && (
        <p className="m-0 text-sm" style={{ color: "var(--paper-mute)" }}>
          Brak ogłoszonych dat u ulubionych.{" "}
          <Link href="/trasy" className="font-bold" style={{ color: "var(--coral)" }}>
            Zobacz trasy
          </Link>
        </p>
      )}
      {showList && (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex flex-col gap-3 rounded-[18px] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              style={{ border: "1px solid var(--line)", background: "var(--ink-2)" }}
            >
              <div className="min-w-0">
                <h3 className="m-0 font-black leading-tight" style={{ fontSize: "18px", letterSpacing: "-.02em" }}>
                  {eventPeople(event).map((person, index) => {
                    const href = standuperProfileHref(person.slug);
                    return (
                      <span key={`${person.slug || person.name}:${index}`}>
                        {index > 0 && <span style={{ color: "var(--paper-meta)" }}>{" \u00b7 "}</span>}
                        {href ? (
                          <Link
                            href={href}
                            className="transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]"
                          >
                            {person.name}
                          </Link>
                        ) : (
                          person.name
                        )}
                      </span>
                    );
                  })}
                </h3>
                <p className="m-0 mt-1 text-sm" style={{ color: "var(--paper-dim)" }}>
                  <time
                    dateTime={event.starts_at}
                    className="mono text-xs uppercase"
                    style={{ color: "var(--paper-meta)", letterSpacing: ".06em" }}
                  >
                    {formatEventWhen(event.starts_at)}
                  </time>
                  <span style={{ color: "var(--paper-mute)" }}> · </span>
                  {event.city}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
                <TicketCta event={event} />
                <Link
                  href={trasyHref({ osoba: event.person.slug })}
                  className="inline-flex min-h-11 items-center text-sm font-bold transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]"
                  style={{ color: "var(--paper-dim)" }}
                >
                  więcej tras
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
