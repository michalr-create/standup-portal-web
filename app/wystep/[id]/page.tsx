import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import JsonLd from "@/app/components/JsonLd";
import EventPlanActions from "@/app/trasy/EventPlanActions";
import EventPlansProvider from "@/app/trasy/EventPlansProvider";
import { cityLandingByName } from "@/lib/city-landings";
import { getPublicEventById } from "@/lib/data";
import {
  eventCrumbLabel,
  eventHeading,
  eventIsPast,
  eventPeople,
  formatEventDate,
  formatEventWhen,
  formatPrice,
  formatRelativeWhen,
  providerLabel,
  standuperProfileHref,
  statusLabel,
  trasyHref,
  visibleTicketLinks,
  wystepHref,
  type TourEvent,
  type TourPerson,
} from "@/lib/events";
import { eventPageGraph } from "@/lib/jsonld";
import { absoluteUrl, contentMetadata } from "@/lib/seo";
import { paidExternalUrl } from "@/lib/youtube";

export const revalidate = 120;

type Props = {
  params: Promise<{ id: string }>;
};

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]";

function parseEventId(raw: string): number | null {
  if (!/^[1-9]\d{0,9}$/.test(raw)) return null;
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  return id;
}

async function loadEvent(rawId: string): Promise<{ event: TourEvent } | null> {
  const id = parseEventId(rawId);
  if (id == null) return null;
  const loaded = await getPublicEventById(id);
  if (!loaded) return null;
  if (loaded.canonicalId !== id) permanentRedirect(wystepHref(loaded.canonicalId));
  return { event: loaded.event };
}

function documentName(event: TourEvent): string {
  const title = event.title?.trim() ?? "";
  return title || eventHeading(event);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const loaded = await loadEvent((await params).id);
  if (!loaded) notFound();
  const { event } = loaded;
  const day = formatEventDate(event.starts_at);
  const names = eventPeople(event)
    .map((person) => person.name.trim())
    .filter(Boolean)
    .join(", ");
  return contentMetadata({
    title: `${documentName(event)} \u2014 ${event.city}, ${day}`,
    description: null,
    fallbackDescription: `Stand-up: ${names || documentName(event)}. ${event.city}, ${event.venue}.`,
    pathname: wystepHref(event.id),
    image: event.image_url,
  });
}

function ExternalIcon() {
  return (
    <svg
      width="16"
      height="16"
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

function PersonLink({ person }: { person: TourPerson }) {
  const href = standuperProfileHref(person.slug);
  if (!href) return <span>{person.name}</span>;
  return (
    <Link href={href} className={`rounded-sm hover:text-white ${focusRing}`}>
      {person.name}
    </Link>
  );
}

export default async function WystepPage({ params }: Props) {
  const rawId = (await params).id;
  const id = parseEventId(rawId);
  if (id == null) notFound();
  const now = new Date();
  const loaded = await getPublicEventById(id);
  if (!loaded) notFound();
  if (loaded.canonicalId !== id) permanentRedirect(wystepHref(loaded.canonicalId));
  const { event } = loaded;
  const past = eventIsPast(event.starts_at, now);
  const roster = eventPeople(event);
  const heading = eventHeading(event);
  const crumb = eventCrumbLabel(event);
  const pageUrl = absoluteUrl(wystepHref(event.id));
  const poster = paidExternalUrl(event.image_url ?? null);
  const price = formatPrice(event.price_from, event.currency);
  const relative = formatRelativeWhen(event.starts_at, now);
  const when = formatEventWhen(event.starts_at);
  const { primary, secondary } = visibleTicketLinks(event.links, paidExternalUrl);
  const landing = cityLandingByName(event.city);
  const profileLinks = roster.filter((person) => standuperProfileHref(person.slug) && person.name.trim());

  return (
    <>
      <JsonLd
        data={eventPageGraph({
          id: event.id,
          title: event.title,
          startsAt: event.starts_at,
          city: event.city,
          venue: event.venue,
          venueAddress: event.venue_address,
          priceFrom: event.price_from,
          currency: event.currency,
          status: event.status,
          imageUrl: poster,
          offerUrl: past ? null : (primary?.href ?? null),
          performers: roster.map((person) => ({ name: person.name, slug: person.slug })),
          now,
          crumb,
          pageUrl,
        })}
      />
      <div className="band">
        <div className="mx-auto max-w-6xl">
          <nav
            aria-label="Okruszki"
            className="mono mb-5 text-xs uppercase"
            style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}
          >
            <Link href="/" className={`hover:text-white ${focusRing}`}>
              Start
            </Link>
            <span aria-hidden="true">{" / "}</span>
            <Link href="/trasy" className={`hover:text-white ${focusRing}`}>
              Trasy
            </Link>
            <span aria-hidden="true">{" / "}</span>
            <span aria-current="page" style={{ color: "var(--paper-dim)" }}>
              {crumb}
            </span>
          </nav>

          <article className="grid items-start gap-6 md:grid-cols-[minmax(240px,380px)_minmax(0,1fr)]">
            <div
              className="relative aspect-[4/3] overflow-hidden"
              style={{ aspectRatio: "4 / 3", borderRadius: "18px", border: "1px solid var(--line)", background: "var(--ink-2)" }}
            >
              {poster ? (
                <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div
                  aria-hidden="true"
                  className="absolute inset-0 flex flex-col justify-end p-5"
                  style={{ background: "linear-gradient(180deg, #1A0E0C 0%, var(--coral-deep) 58%, #F2A65A 100%)" }}
                >
                  <p
                    className="m-0 font-black leading-[1.05]"
                    style={{ color: "var(--ink)", fontSize: "clamp(1.5rem, 4vw, 2rem)", letterSpacing: "-.03em" }}
                  >
                    {heading}
                  </p>
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <p className="mono m-0 text-xs uppercase" style={{ color: "var(--paper-meta)", letterSpacing: ".06em" }}>
                  {when}
                </p>
                {relative && (
                  <span
                    className="mono shrink-0 rounded-full px-2 py-0.5 text-xs"
                    style={{ color: "var(--paper-mute)", background: "var(--ink-4)", letterSpacing: ".04em" }}
                  >
                    {relative}
                  </span>
                )}
                <span
                  className="mono shrink-0 rounded-full px-2.5 py-1 text-xs font-bold uppercase"
                  style={
                    past
                      ? { background: "var(--ink-4)", color: "var(--paper-dim)", letterSpacing: ".06em" }
                      : event.status === "on_sale"
                        ? { background: "var(--coral)", color: "var(--ink)", letterSpacing: ".06em" }
                        : { background: "var(--ink-4)", color: "var(--paper-dim)", letterSpacing: ".06em" }
                  }
                >
                  {past ? "Już się odbył" : statusLabel(event.status)}
                </span>
              </div>

              <h1
                className="m-0 mt-2 font-black leading-none"
                style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-.025em" }}
              >
                {heading}
              </h1>

              {roster.length > 0 && (
                <p className="m-0 mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-lg font-black">
                  {roster.map((person, index) => (
                    <span key={`${person.slug || person.name}:${index}`}>
                      {index > 0 && <span style={{ color: "var(--paper-meta)" }}>{" · "}</span>}
                      <PersonLink person={person} />
                    </span>
                  ))}
                </p>
              )}

              <p className="m-0 mt-3">
                {event.city}
                <span style={{ color: "var(--paper-meta)" }}> · </span>
                {event.venue}
              </p>
              {event.venue_address && (
                <p className="m-0 mt-1" style={{ color: "var(--paper-dim)" }}>
                  {event.venue_address}
                </p>
              )}
              {price && (
                <p className="mono m-0 mt-3 text-xs uppercase" style={{ color: "var(--paper-dim)", letterSpacing: ".06em" }}>
                  {price}
                </p>
              )}

              <div className="relative mt-5 flex flex-col items-start gap-3 focus-within:z-20">
                {past ? (
                  <p className="m-0 text-lg font-black">Występ już się odbył</p>
                ) : primary ? (
                  <a
                    href={primary.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex min-h-12 items-center gap-2 rounded-full px-5 text-base font-black hover:bg-[var(--coral-hi)] ${focusRing}`}
                    style={{ background: "var(--coral)", color: "var(--ink)" }}
                  >
                    Kup bilet
                    <span>{providerLabel(primary.link.ticket_provider)}</span>
                    <ExternalIcon />
                    <span className="sr-only">, otwiera się w nowej karcie</span>
                  </a>
                ) : (
                  <p className="m-0 text-sm" style={{ color: "var(--paper-mute)" }}>
                    Link do biletów niedostępny
                  </p>
                )}
                {!past && secondary.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {secondary.map((item) => (
                      <a
                        key={`${item.link.ticket_provider}:${item.link.external_id}`}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-black hover:bg-[rgba(232,89,74,.16)] ${focusRing}`}
                        style={{ color: "var(--coral)", border: "1px solid var(--coral)" }}
                      >
                        {providerLabel(item.link.ticket_provider)}
                        <ExternalIcon />
                        <span className="sr-only">, otwiera się w nowej karcie</span>
                      </a>
                    ))}
                  </div>
                )}
                <EventPlansProvider eventIds={[event.id]}>
                  <EventPlanActions
                    eventId={event.id}
                    title={event.title}
                    startsAt={event.starts_at}
                    city={event.city}
                    venue={event.venue}
                    ticketUrl={primary?.href ?? event.ticket_url}
                  />
                </EventPlansProvider>
              </div>

              {profileLinks.length > 0 && (
                <div className="mt-6 flex flex-col items-start gap-1">
                  {profileLinks.map((person) => (
                    <Link
                      key={person.slug}
                      href={trasyHref({ osoba: person.slug })}
                      className={`inline-block py-1 text-sm font-bold underline-offset-4 hover:underline ${focusRing}`}
                      style={{ color: "var(--coral)" }}
                    >
                      {`Więcej terminów: ${person.name}`}
                    </Link>
                  ))}
                  {landing && (
                    <Link
                      href={`/trasy/${landing.slug}`}
                      className={`inline-block py-1 text-sm font-bold underline-offset-4 hover:underline ${focusRing}`}
                      style={{ color: "var(--coral)" }}
                    >
                      {`Więcej ${landing.inCity}`}
                    </Link>
                  )}
                </div>
              )}
            </div>
          </article>
        </div>
      </div>
    </>
  );
}
