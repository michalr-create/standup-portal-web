import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import JsonLd from "@/app/components/JsonLd";
import Pager from "@/app/components/Pager";
import SectionHead from "@/app/components/SectionHead";
import { getTrasyListing } from "@/lib/data";
import { cityLandingHref, cityLeadParagraphs, resolveCityParam } from "@/lib/city-landings";
import { PUBLIC_LISTING_PAGE_SIZE, clampListingPage } from "@/lib/category-browse";
import { listingCountLabel } from "@/lib/listing-count";
import { getOpenMicCatalog } from "@/lib/open-mic-data";
import {
  buildOpenMicView,
  nextOpenMicDate,
  openMicHref,
} from "@/lib/open-mics";
import {
  formatEventWhen,
  groupEventsByMonth,
  hasActiveTrasyFilters,
  parseTrasySearchParams,
  terminLabel,
  warsawToday,
  type TrasySearch,
} from "@/lib/events";
import { cityPageGraph } from "@/lib/jsonld";
import { absoluteUrl, contentMetadata } from "@/lib/seo";
import EventCard from "../EventCard";
import EventPlansProvider from "../EventPlansProvider";
import TrasyFilters from "../TrasyFilters";

export const revalidate = 120;

type Props = {
  params: Promise<{ miasto: string }>;
  searchParams: Promise<TrasySearch>;
};

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]";

const OPEN_MIC_FILTERS = { miasto: "", dzien: 0 as const, jezyk: "" as const };

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
      <p className="mono mb-4 text-xs uppercase" style={{ color: "var(--coral)", letterSpacing: ".16em" }}>
        {eyebrow}
      </p>
      <h2 className="m-0 font-black" style={{ fontSize: "clamp(28px, 4vw, 40px)", letterSpacing: "-.03em" }}>
        {title}
        <span className="dot-accent">.</span>
      </h2>
      <div className="mx-auto mt-4 max-w-md text-[16px] leading-relaxed" style={{ color: "var(--paper-dim)" }}>
        {children}
      </div>
    </div>
  );
}

function settle(raw: TrasySearch, slug: string) {
  const { miasto: ignored, ...rest } = raw;
  const parsed = parseTrasySearchParams(rest);
  if (ignored != null || parsed.redirectHref) {
    const target = cityLandingHref(slug, { ...parsed.filters, page: parsed.page });
    if (ignored != null) permanentRedirect(target);
    redirect(target);
  }
  return parsed;
}

function MonthHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-6">
      <div className="flex flex-wrap items-baseline gap-4">
        <h2 className="m-0 font-black leading-none" style={{ fontSize: "clamp(24px, 3vw, 32px)", letterSpacing: "-.025em" }}>
          {title}
          <span className="dot-accent">.</span>
        </h2>
        {sub && (
          <span className="mono text-xs uppercase" style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}>
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { miasto } = await params;
  const resolved = resolveCityParam(miasto);
  if (!resolved) notFound();
  const parsed = settle(await searchParams, resolved.city.slug);
  if (resolved.redirect) permanentRedirect(cityLandingHref(resolved.city.slug, { ...parsed.filters, page: parsed.page }));
  const description = cityLeadParagraphs(resolved.city.description)[0] ?? "";
  return contentMetadata({
    title: `Stand-up ${resolved.city.name} \u2014 terminy i bilety`,
    description: description || null,
    fallbackDescription: `Nadchodzące występy stand-up: ${resolved.city.name}. Terminy i linki do biletów.`,
    pathname: `/trasy/${resolved.city.slug}`,
    page: parsed.page,
  });
}

export default async function CityTourPage({ params, searchParams }: Props) {
  const { miasto } = await params;
  const resolved = resolveCityParam(miasto);
  if (!resolved) notFound();
  const parsed = settle(await searchParams, resolved.city.slug);
  if (resolved.redirect) permanentRedirect(cityLandingHref(resolved.city.slug, { ...parsed.filters, page: parsed.page }));

  const city = resolved.city;
  const filters = { ...parsed.filters, miasto: city.name };
  const now = new Date();
  const [listing, catalog] = await Promise.all([
    getTrasyListing(filters, parsed.page, PUBLIC_LISTING_PAGE_SIZE, now, {
      nationalCatalog: false,
    }),
    getOpenMicCatalog(now),
  ]);
  if (listing.ok && filters.osoba && !listing.facets.people.some((person) => person.slug === filters.osoba)) {
    redirect(cityLandingHref(city.slug, { ...filters, osoba: "" }));
  }
  if (listing.ok) {
    const clamped = clampListingPage(parsed.page, listing.total, PUBLIC_LISTING_PAGE_SIZE);
    if (clamped.page !== parsed.page) redirect(cityLandingHref(city.slug, { ...filters, page: clamped.page }));
  }

  const groups = groupEventsByMonth(listing.events);
  const extraFilters = hasActiveTrasyFilters({ ...parsed.filters, miasto: "" });
  const listCount = !listing.ok
    ? null
    : listingCountLabel({
        catalogTotal: listing.total,
        shown: listing.events.length,
        inView: listing.events.length,
        word: { one: "wydarzenie", few: "wydarzenia", many: "wydarzeń" },
        filtered: extraFilters,
        server: true,
      });
  const leadParagraphs = cityLeadParagraphs(city.description);
  const pageUrl = absoluteUrl(`/trasy/${city.slug}`);

  const openMics = catalog.ok
    ? buildOpenMicView(catalog.cycles, catalog.dates, { ...OPEN_MIC_FILTERS, miasto: city.name }, now)
    : null;
  const openMicHrefForCity = openMicHref({ miasto: city.name });

  return (
    <>
      <JsonLd data={cityPageGraph(city.name, pageUrl)} />
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
              {city.name}
            </span>
          </nav>

          <header className="mb-4 lg:mb-8">
            <h1
              className="m-0 font-black leading-none"
              style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-.025em" }}
            >
              {`Stand-up w ${city.inCity}`}
              <span className="dot-accent">.</span>
            </h1>
            {leadParagraphs.map((paragraph) => (
              <p
                key={paragraph}
                className="m-0 mt-4 max-w-2xl text-[15px] md:text-[17px]"
                style={{ color: "var(--paper-dim)" }}
              >
                {paragraph}
              </p>
            ))}
          </header>

          {!listing.ok ? (
            <Notice eyebrow="trasy" title="Coś poszło nie tak">
              Nie udało się wczytać terminów. Odśwież stronę za chwilę.
            </Notice>
          ) : (
            <TrasyFilters filters={filters} facets={listing.facets} today={warsawToday(now)} hideCityChips>
              {listCount && (
                <div className="mb-5">
                  <span className="mono text-xs uppercase" style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}>
                    {listCount}
                  </span>
                </div>
              )}
              {listing.total === 0 ? (
                <Notice eyebrow="kalendarz" title="Brak terminów">
                  <p className="m-0">{`Nie ma teraz ogłoszonych występów w ${city.inCity}.`}</p>
                  <Link href="/trasy" className="mt-6 inline-flex min-h-11 items-center font-black" style={{ color: "var(--coral)" }}>
                    Wszystkie trasy
                  </Link>
                </Notice>
              ) : (
                <EventPlansProvider eventIds={listing.events.map((event) => event.id)}>
                  <div className="flex flex-col gap-10">
                    {groups.map((group) => (
                      <section key={group.key}>
                        <MonthHead title={group.label} sub={`${group.events.length} ${terminLabel(group.events.length)}`} />
                        <div className="flex flex-col gap-3">
                          {group.events.map((event) => (
                            <EventCard key={event.id} event={event} now={now} />
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                </EventPlansProvider>
              )}
              {listing.total > 0 && (
                <Pager
                  page={parsed.page}
                  total={listing.total}
                  pageSize={PUBLIC_LISTING_PAGE_SIZE}
                  hrefForPage={(page) => cityLandingHref(city.slug, { ...filters, page })}
                />
              )}
            </TrasyFilters>
          )}

          {openMics && openMics.cycles.length > 0 && (
            <section className="mt-14">
              <SectionHead title="Open miki" linkHref={openMicHrefForCity} linkText="Pokaż wszystkie →" />
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {openMics.cycles.map((cycle) => {
                  const next = nextOpenMicDate(cycle, openMics.dates);
                  const meta = [cycle.venue, next ? formatEventWhen(next.starts_at) : null].filter(Boolean).join(" · ");
                  return (
                    <li
                      key={cycle.id}
                      className="rounded-[18px] px-4 py-3"
                      style={{ border: "1px solid var(--line)", background: "var(--ink-2)" }}
                    >
                      <Link
                        href={openMicHrefForCity}
                        className={`font-black underline-offset-4 hover:underline ${focusRing}`}
                      >
                        {cycle.name}
                      </Link>
                      {meta ? (
                        <p className="m-0 mt-1 text-sm" style={{ color: "var(--paper-dim)" }}>
                          {meta}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
