import Link from "next/link";
import {
  eventPeople,
  formatEventWhen,
  formatPrice,
  formatRelativeWhen,
  profileWatchAriaLabel,
  profileWatchLabel,
  providerLabel,
  standuperProfileHref,
  statusLabel,
  visibleTicketLinks,
  type TicketLink,
  type TourEvent,
  type TourPerson,
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

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]";

function PortalBadge({ link, href }: { link: TicketLink; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-black transition-colors hover:bg-[rgba(232,89,74,.16)] ${focusRing}`}
      style={{ color: "var(--coral)", border: "1px solid var(--coral)" }}
    >
      {providerLabel(link.ticket_provider)}
      <ExternalIcon />
      <span className="sr-only">, otwiera się w nowej karcie</span>
    </a>
  );
}

function TicketCta({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-black transition-colors hover:bg-[var(--coral-hi)] ${focusRing}`}
      style={{ background: "var(--coral)", color: "var(--ink)" }}
    >
      {label}
      <ExternalIcon />
      <span className="sr-only">, otwiera się w nowej karcie</span>
    </a>
  );
}

function PersonName({ person }: { person: TourPerson }) {
  const href = standuperProfileHref(person.slug);
  if (!href) return person.name;
  return (
    <Link href={href} className={`rounded-sm hover:text-white ${focusRing}`}>
      {person.name}
    </Link>
  );
}

function posterLabel(roster: readonly TourPerson[]): string {
  return roster.map((person) => person.name).filter(Boolean).join(" \u00b7 ");
}

export default function EventCard({ event, now }: { event: TourEvent; now: Date }) {
  const roster = eventPeople(event);
  const solo = roster.length <= 1;
  const lead = roster[0] ?? event.person;
  const poster = paidExternalUrl(event.image_url ?? null);
  const price = formatPrice(event.price_from, event.currency);
  const onSale = event.status === "on_sale";
  const relative = formatRelativeWhen(event.starts_at, now);
  const profileHref = standuperProfileHref(lead.slug);
  const { primary, secondary } = visibleTicketLinks(event.links, paidExternalUrl);
  const primaryHref = primary?.href ?? null;
  const cardStyle = { border: "1px solid var(--line)", background: "var(--ink-2)" };
  const statusStyle = onSale
    ? {
        background: "var(--coral)",
        color: "var(--ink)",
        letterSpacing: ".06em",
        boxShadow: "0 0 0 2px var(--ink)",
      }
    : {
        background: "var(--ink-4)",
        color: "var(--paper-dim)",
        border: "1px solid var(--line-2)",
        letterSpacing: ".06em",
        boxShadow: "0 0 0 2px var(--ink)",
      };

  return (
    <article className="overflow-hidden rounded-[18px]" style={cardStyle}>
      <div
        className="relative aspect-[4/3] w-full overflow-hidden rounded-t-[18px]"
        style={{ aspectRatio: "4 / 3" }}
      >
        {poster ? (
          <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div
            aria-hidden="true"
            className="absolute inset-0 flex flex-col justify-end p-4 sm:p-5"
            style={{ background: "linear-gradient(180deg, #1A0E0C 0%, var(--coral-deep) 58%, #F2A65A 100%)" }}
          >
            <p
              className="m-0 line-clamp-3 font-black leading-[1.05]"
              style={{ color: "var(--ink)", fontSize: "clamp(1.5rem, 4vw, 2rem)", letterSpacing: "-.03em" }}
            >
              {posterLabel(roster.length > 0 ? roster : [lead])}
            </p>
            {event.city ? (
              <p className="m-0 mt-2 text-sm font-extrabold" style={{ color: "var(--ink)" }}>
                {event.city}
              </p>
            ) : null}
          </div>
        )}
        <span
          className="mono absolute right-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold uppercase"
          style={statusStyle}
        >
          {statusLabel(event.status)}
        </span>
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <p
            className="mono m-0 text-xs uppercase"
            style={{ color: "var(--paper-meta)", letterSpacing: ".06em" }}
          >
            {formatEventWhen(event.starts_at)}
          </p>
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
        </div>
        <h3 className="m-0 mt-1 font-black leading-tight" style={{ fontSize: "20px", letterSpacing: "-.02em" }}>
          {solo ? (
            profileHref ? (
              <Link href={profileHref} className={`rounded-sm hover:text-white ${focusRing}`}>
                {lead.name}
              </Link>
            ) : (
              lead.name
            )
          ) : (
            roster.map((person, index) => (
              <span key={`${person.slug || person.name}:${index}`}>
                {index > 0 && <span style={{ color: "var(--paper-meta)" }}>{" \u00b7 "}</span>}
                <PersonName person={person} />
              </span>
            ))
          )}
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
        {solo && profileHref && (
          <Link
            href={profileHref}
            aria-label={profileWatchAriaLabel([lead.name])}
            className={`mt-3 inline-flex min-h-11 items-center text-sm font-bold underline-offset-4 hover:underline ${focusRing}`}
            style={{ color: "var(--coral)" }}
          >
            {profileWatchLabel(Boolean(primaryHref))}
          </Link>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 px-4 pb-4 sm:px-5 sm:pb-5">
        {primary && <TicketCta href={primary.href} label={providerLabel(primary.link.ticket_provider)} />}
        {secondary.map((item) => (
          <PortalBadge key={`${item.link.ticket_provider}:${item.link.external_id}`} link={item.link} href={item.href} />
        ))}
        {!primary && (
          <span className="text-sm" style={{ color: "var(--paper-mute)" }}>
            Link do biletów niedostępny
          </span>
        )}
      </div>
    </article>
  );
}
