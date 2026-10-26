import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import TrasyFilters from "./TrasyFilters";
import { getUpcomingEvents } from "@/lib/data";
import {
  eventFacets,
  facetRedirect,
  filterUpcomingEvents,
  formatEventWhen,
  formatPrice,
  groupEventsByMonth,
  hasActiveTrasyFilters,
  parseTrasySearchParams,
  providerLabel,
  statusLabel,
  terminLabel,
  warsawToday,
  type TicketLink,
  type TourEvent,
  type TrasySearch,
} from "@/lib/events";
import { paidExternalUrl } from "@/lib/youtube";

export const metadata: Metadata = {
  title: "Trasy — parska.",
  description: "Nadchodzące terminy polskiego stand-upu i linki do biletów.",
};

export const revalidate = 120;

type Props = {
  searchParams: Promise<TrasySearch>;
};

function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-6">
      <div className="flex flex-wrap items-baseline gap-4">
        <h2
          className="m-0 font-black leading-none"
          style={{ fontSize: "clamp(24px, 3vw, 32px)", letterSpacing: "-.025em" }}
        >
          {title}
          <span className="dot-accent">.</span>
        </h2>
        {sub && (
          <span
            className="mono text-xs uppercase"
            style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}
          >
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

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

function PortalBadge({ link, href }: { link: TicketLink; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-black transition-colors hover:bg-[rgba(232,89,74,.16)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]"
      style={{ color: "var(--coral)", border: "1px solid var(--coral)" }}
    >
      {providerLabel(link.ticket_provider)}
      <ExternalIcon />
      <span className="sr-only">, otwiera się w nowej karcie</span>
    </a>
  );
}

function EventCard({ event }: { event: TourEvent }) {
  const photo = paidExternalUrl(event.person.photo_url);
  const price = formatPrice(event.price_from, event.currency);
  const onSale = event.status === "on_sale";
  const portals = event.links.flatMap((link) => {
    const href = paidExternalUrl(link.ticket_url);
    return href ? [{ link, href }] : [];
  });
  const primaryHref = portals.find((item) => item.link.is_primary)?.href ?? portals[0]?.href ?? null;
  const cardStyle = { border: "1px solid var(--line)", background: "var(--ink-2)" };
  const linkClass =
    "block rounded-t-[18px] p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)] sm:p-5";

  const details = (
    <>
      <div className="flex items-start gap-3 sm:gap-4">
        <div
          className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full text-sm font-black"
          style={{ background: "linear-gradient(135deg, var(--coral), #F2A65A)", color: "var(--ink)" }}
        >
          {photo ? (
            <img src={photo} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(event.person.name)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p
              className="mono m-0 text-xs uppercase"
              style={{ color: "var(--paper-meta)", letterSpacing: ".06em" }}
            >
              {formatEventWhen(event.starts_at)}
            </p>
            <span
              className="mono shrink-0 rounded-full px-2.5 py-1 text-xs font-bold uppercase"
              style={
                onSale
                  ? { background: "var(--coral)", color: "var(--ink)", letterSpacing: ".06em" }
                  : {
                      background: "var(--ink-4)",
                      color: "var(--paper-dim)",
                      border: "1px solid var(--line-2)",
                      letterSpacing: ".06em",
                    }
              }
            >
              {statusLabel(event.status)}
            </span>
          </div>
          <h3 className="m-0 mt-1 font-black leading-tight" style={{ fontSize: "20px", letterSpacing: "-.02em" }}>
            {event.person.name}
          </h3>
          {event.title && (
            <p className="m-0 mt-1 line-clamp-2" style={{ color: "var(--paper-dim)" }}>
              {event.title}
            </p>
          )}
          <p className="m-0 mt-2">
            {event.city}
            <span style={{ color: "var(--paper-meta)" }}> · </span>
            {event.venue}
          </p>
          {event.venue_address && (
            <p className="m-0 mt-1 text-sm" style={{ color: "var(--paper-mute)" }}>
              {event.venue_address}
            </p>
          )}
          {price && (
            <p className="mono m-0 mt-3 text-xs uppercase" style={{ color: "var(--paper-dim)", letterSpacing: ".06em" }}>
              {price}
            </p>
          )}
        </div>
      </div>
      {primaryHref && <span className="sr-only">Bilety, otwiera się w nowej karcie</span>}
    </>
  );

  return (
    <article className="rounded-[18px] transition-transform hover:-translate-y-0.5" style={cardStyle}>
      {primaryHref ? (
        <a href={primaryHref} target="_blank" rel="noopener noreferrer" className={linkClass}>
          {details}
        </a>
      ) : (
        <div className="p-4 sm:p-5">{details}</div>
      )}
      <div className="flex flex-wrap items-center gap-2 px-4 pb-4 sm:px-5 sm:pb-5">
        {portals.length > 0 ? (
          portals.map((item) => (
            <PortalBadge key={`${item.link.ticket_provider}:${item.link.external_id}`} link={item.link} href={item.href} />
          ))
        ) : (
          <span className="text-sm" style={{ color: "var(--paper-mute)" }}>
            Link do biletów niedostępny
          </span>
        )}
      </div>
    </article>
  );
}

function Notice({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      className="rounded-[18px] px-6 py-16 text-center"
      style={{ border: "1px dashed var(--line-2)", background: "var(--ink-2)" }}
    >
      <p
        className="mono mb-4 text-xs uppercase"
        style={{ color: "var(--coral)", letterSpacing: ".16em" }}
      >
        {eyebrow}
      </p>
      <h2
        className="m-0 font-black"
        style={{ fontSize: "clamp(28px, 4vw, 40px)", letterSpacing: "-.03em" }}
      >
        {title}
        <span className="dot-accent">.</span>
      </h2>
      <div className="mx-auto mt-4 max-w-md text-[16px] leading-relaxed" style={{ color: "var(--paper-dim)" }}>
        {children}
      </div>
    </div>
  );
}

export default async function TrasyPage({ searchParams }: Props) {
  const parsed = parseTrasySearchParams(await searchParams);
  if (parsed.redirectHref) redirect(parsed.redirectHref);

  const now = new Date();
  const result = await getUpcomingEvents(now);
  const facets = eventFacets(result.events);
  const unknownFacet = facetRedirect(parsed.filters, facets);
  if (unknownFacet) redirect(unknownFacet);

  const filtered = filterUpcomingEvents(result.events, parsed.filters, now);
  const groups = groupEventsByMonth(filtered);
  const filteredView = hasActiveTrasyFilters(parsed.filters);
  const countLabel = !result.ok
    ? "błąd wczytywania"
    : result.events.length === 0
      ? "na razie pusto"
      : filteredView
        ? `${filtered.length} z ${result.events.length}`
        : `${filtered.length} ${terminLabel(filtered.length)}`;

  return (
    <div className="band">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <div className="mb-2 flex flex-wrap items-baseline gap-4">
            <h1
              className="m-0 font-black leading-none"
              style={{ fontSize: "clamp(32px, 4vw, 44px)", letterSpacing: "-.025em" }}
            >
              Trasy
              <span className="dot-accent">.</span>
            </h1>
            <span
              className="mono text-xs uppercase"
              style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}
            >
              {countLabel}
            </span>
          </div>
          <p className="m-0 max-w-2xl text-[15px] md:text-[17px]" style={{ color: "var(--paper-dim)" }}>
            Nadchodzące występy stand-upowe. Karta i plakietka portalu otwierają sprzedaż biletów w nowej karcie.
          </p>
        </header>

        {result.ok && (
          <TrasyFilters filters={parsed.filters} facets={facets} today={warsawToday(now)} />
        )}

        {!result.ok ? (
          <Notice eyebrow="trasy" title="Coś poszło nie tak">
            Nie udało się wczytać terminów. Odśwież stronę za chwilę.
          </Notice>
        ) : filtered.length === 0 ? (
          <Notice eyebrow="kalendarz" title="Brak terminów">
            {filteredView ? (
              <>
                <p className="m-0">Żaden nadchodzący występ nie pasuje do tych filtrów.</p>
                <Link
                  href="/trasy"
                  className="mt-6 inline-flex min-h-11 items-center font-black"
                  style={{ color: "var(--coral)" }}
                >
                  Wyczyść filtry
                </Link>
              </>
            ) : (
              <p className="m-0">
                Nie ma jeszcze ogłoszonych dat. Gdy pojawią się trasy, zobaczysz tu miasto, scenę i link do biletów.
              </p>
            )}
          </Notice>
        ) : (
          <div className="flex flex-col gap-10">
            {groups.map((group) => (
              <section key={group.key}>
                <SectionHead title={group.label} sub={`${group.events.length} ${terminLabel(group.events.length)}`} />
                <div className="flex flex-col gap-3">
                  {group.events.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
