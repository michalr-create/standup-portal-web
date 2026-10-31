import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import EventCard from "./EventCard";
import TrasyFilters from "./TrasyFilters";
import Pager from "@/app/components/Pager";
import { getTrasyListing } from "@/lib/data";
import { PUBLIC_LISTING_PAGE_SIZE, clampListingPage } from "@/lib/category-browse";
import { listingCountLabel } from "@/lib/listing-count";
import {
  facetRedirect,
  groupEventsByMonth,
  hasActiveTrasyFilters,
  parseTrasySearchParams,
  terminLabel,
  trasyHref,
  warsawToday,
  type TrasySearch,
} from "@/lib/events";

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
  const listing = await getTrasyListing(parsed.filters, parsed.page, PUBLIC_LISTING_PAGE_SIZE, now);
  if (listing.ok) {
    const unknownFacet = facetRedirect(parsed.filters, listing.facets, parsed.page);
    if (unknownFacet) redirect(unknownFacet);
    const clamped = clampListingPage(parsed.page, listing.total, PUBLIC_LISTING_PAGE_SIZE);
    if (clamped.page !== parsed.page) redirect(trasyHref({ ...parsed.filters, page: clamped.page }));
  }

  const groups = groupEventsByMonth(listing.events);
  const filteredView = hasActiveTrasyFilters(parsed.filters);
  const headerStatus = !listing.ok
    ? "błąd wczytywania"
    : listing.catalogTotal === 0
      ? "na razie pusto"
      : null;
  const listCount = !listing.ok || listing.catalogTotal === 0
    ? null
    : filteredView
      ? `${listing.total} z ${listing.catalogTotal}`
      : listingCountLabel({
          catalogTotal: listing.total,
          shown: listing.events.length,
          inView: listing.events.length,
          word: { one: "wydarzenie", few: "wydarzenia", many: "wydarze\u0144" },
          filtered: false,
          server: true,
        });
  const hrefForPage = (page: number) => trasyHref({ ...parsed.filters, page });

  return (
    <div className="band">
      <div className="mx-auto max-w-6xl">
        <header className="mb-4 lg:mb-8">
          <div className="mb-2 flex flex-wrap items-baseline gap-4">
            <h1
              className="m-0 font-black leading-none"
              style={{ fontSize: "clamp(32px, 4vw, 44px)", letterSpacing: "-.025em" }}
            >
              Trasy
              <span className="dot-accent">.</span>
            </h1>
            {headerStatus && (
              <span
                className="mono text-xs uppercase"
                style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}
              >
                {headerStatus}
              </span>
            )}
          </div>
          <p className="m-0 max-w-2xl text-[15px] md:text-[17px]" style={{ color: "var(--paper-dim)" }}>
            Nadchodzące występy stand-upowe. Imię prowadzi do profilu artysty, a bilety i plakietki portali otwierają się w nowej karcie.
          </p>
        </header>

        {!listing.ok ? (
          <Notice eyebrow="trasy" title="Coś poszło nie tak">
            Nie udało się wczytać terminów. Odśwież stronę za chwilę.
          </Notice>
        ) : (
          <TrasyFilters filters={parsed.filters} facets={listing.facets} today={warsawToday(now)}>
            {listCount && (
              <div className="mb-5 flex items-center justify-between gap-3">
                <span
                  className="mono text-xs uppercase"
                  style={{ color: "var(--paper-mute)", letterSpacing: ".16em", minWidth: 0, flex: "1 1 auto" }}
                >
                  {listCount}
                </span>
              </div>
            )}
            {listing.total === 0 ? (
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
                        <EventCard key={event.id} event={event} now={now} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
            {listing.total > 0 && (
              <Pager page={parsed.page} total={listing.total} pageSize={PUBLIC_LISTING_PAGE_SIZE} hrefForPage={hrefForPage} />
            )}
          </TrasyFilters>
        )}
      </div>
    </div>
  );
}
