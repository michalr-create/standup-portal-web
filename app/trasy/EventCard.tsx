import Link from "next/link";
import {
  formatEventWhen,
  formatPrice,
  formatRelativeWhen,
  profileWatchLabel,
  providerLabel,
  standuperProfileHref,
  statusLabel,
  type TicketLink,
  type TourEvent,
} from "@/lib/events";
import { paidExternalUrl } from "@/lib/youtube";

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

function TicketCta({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-black transition-colors hover:bg-[var(--coral-hi)] ${focusRing}`}
      style={{ background: "var(--coral)", color: "var(--ink)" }}
    >
      Bilety
      <ExternalIcon />
      <span className="sr-only">, otwiera się w nowej karcie</span>
    </a>
  );
}

function PersonAvatar({ name, photo, href }: { name: string; photo: string | null; href: string | null }) {
  const face = (
    <span
      className="grid h-full w-full place-items-center overflow-hidden rounded-full"
      style={{ background: "linear-gradient(135deg, var(--coral), #F2A65A)", color: "var(--ink)" }}
    >
      {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : initials(name)}
    </span>
  );
  const frame = "grid h-12 w-12 shrink-0 place-items-center rounded-full text-sm font-black";
  if (!href) return <div className={frame}>{face}</div>;
  return (
    <Link href={href} aria-label={`Profil: ${name}`} className={`${frame} ${focusRing}`}>
      {face}
    </Link>
  );
}

export default function EventCard({ event, now }: { event: TourEvent; now: Date }) {
  const photo = paidExternalUrl(event.person.photo_url);
  const price = formatPrice(event.price_from, event.currency);
  const onSale = event.status === "on_sale";
  const relative = formatRelativeWhen(event.starts_at, now);
  const profileHref = standuperProfileHref(event.person.slug);
  const portals = event.links.flatMap((link) => {
    const href = paidExternalUrl(link.ticket_url);
    return href ? [{ link, href }] : [];
  });
  const primaryHref = portals.find((item) => item.link.is_primary)?.href ?? portals[0]?.href ?? null;
  const cardStyle = { border: "1px solid var(--line)", background: "var(--ink-2)" };

  return (
    <article className="rounded-[18px]" style={cardStyle}>
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          <PersonAvatar name={event.person.name} photo={photo} href={profileHref} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
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
              {profileHref ? (
                <Link href={profileHref} className={`rounded-sm hover:text-white ${focusRing}`}>
                  {event.person.name}
                </Link>
              ) : (
                event.person.name
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
            {profileHref && (
              <Link
                href={profileHref}
                className={`mt-3 inline-flex min-h-11 items-center text-sm font-bold underline-offset-4 hover:underline ${focusRing}`}
                style={{ color: "var(--coral)" }}
              >
                {profileWatchLabel(Boolean(primaryHref))}
              </Link>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 px-4 pb-4 sm:px-5 sm:pb-5">
        {primaryHref && <TicketCta href={primaryHref} />}
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
