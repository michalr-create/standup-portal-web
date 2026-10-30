import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import OpenMicCard from "./OpenMicCard";
import OpenMicDates from "./OpenMicDates";
import OpenMicFilters from "./OpenMicFilters";
import { getOpenMicCatalog } from "@/lib/open-mic-data";
import {
  buildOpenMicView,
  cyklLabel,
  hasActiveOpenMicFilters,
  nextOpenMicDate,
  openMicFacetRedirect,
  parseOpenMicSearchParams,
  type OpenMicSearch,
} from "@/lib/open-mics";

export const metadata: Metadata = {
  title: "Open mic — parska.",
  description:
    "Cykliczne open miki stand-upowe w Polsce: miasto, scena, zapisy i najbliższe terminy z linkiem do biletów.",
  alternates: { canonical: "https://parska.pl/open-mic" },
  openGraph: {
    title: "Open mic — parska.",
    description:
      "Cykliczne open miki stand-upowe w Polsce: miasto, scena, zapisy i najbliższe terminy z linkiem do biletów.",
    url: "https://parska.pl/open-mic",
    locale: "pl_PL",
    type: "website",
  },
};

export const revalidate = 120;

type Props = {
  searchParams: Promise<OpenMicSearch>;
};

const addClass =
  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--coral)] px-5 py-2.5 text-sm font-black text-[var(--ink)] transition-colors hover:bg-[var(--coral-hi)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--paper)] sm:w-auto";

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

export default async function OpenMicPage({ searchParams }: Props) {
  const parsed = parseOpenMicSearchParams(await searchParams);
  if (parsed.redirectHref) redirect(parsed.redirectHref);

  const now = new Date();
  const catalog = await getOpenMicCatalog(now);
  const view = buildOpenMicView(catalog.cycles, catalog.dates, parsed.filters, now);
  if (catalog.ok) {
    const unknownCity = openMicFacetRedirect(parsed.filters, view.cities);
    if (unknownCity) redirect(unknownCity);
  }

  const filtered = hasActiveOpenMicFilters(parsed.filters);
  const countLabel = !catalog.ok
    ? "błąd wczytywania"
    : view.catalogCount === 0
      ? "na razie pusto"
      : filtered
        ? `${view.cycles.length} z ${view.catalogCount}`
        : `${view.catalogCount} ${cyklLabel(view.catalogCount)}`;

  return (
    <div className="band">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-baseline gap-4">
              <h1
                className="m-0 font-black leading-none"
                style={{ fontSize: "clamp(32px, 4vw, 44px)", letterSpacing: "-.025em" }}
              >
                Open mic
                <span className="dot-accent">.</span>
              </h1>
              <span className="mono text-xs uppercase" style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}>
                {countLabel}
              </span>
            </div>
            <p className="m-0 max-w-2xl text-[15px] md:text-[17px]" style={{ color: "var(--paper-dim)" }}>
              Cykliczne open miki stand-upowe. Na karcie jest scena, zapisy i najbliższy termin, a bilety otwierają się w nowej karcie.
            </p>
          </div>
          <Link href="/open-mic/dodaj" className={addClass}>
            Dodaj swój open mic
          </Link>
        </header>

        {catalog.ok && view.catalogCount > 0 && <OpenMicFilters filters={parsed.filters} cities={view.cities} />}

        {!catalog.ok ? (
          <Notice eyebrow="open mic" title="Coś poszło nie tak">
            Nie udało się wczytać open miców. Odśwież stronę za chwilę.
          </Notice>
        ) : view.catalogCount === 0 ? (
          <Notice eyebrow="open mic" title="Brak open miców">
            <p className="m-0">
              Nie ma jeszcze ogłoszonych cykli. Gdy pojawią się open miki, zobaczysz tu miasto, scenę, zapisy i najbliższe terminy.
            </p>
          </Notice>
        ) : view.cycles.length === 0 ? (
          <Notice eyebrow="filtry" title="Brak wyników">
            <p className="m-0">Żaden open mic nie pasuje do tych filtrów.</p>
            <Link href="/open-mic" className="mt-6 inline-flex min-h-11 items-center font-black" style={{ color: "var(--coral)" }}>
              Wyczyść filtry
            </Link>
          </Notice>
        ) : (
          <div className="flex flex-col gap-3">
            {view.cycles.map((cycle) => (
              <OpenMicCard key={cycle.id} cycle={cycle} next={nextOpenMicDate(cycle, view.dates)} now={now} />
            ))}
          </div>
        )}

        {catalog.ok && view.cycles.length > 0 && (
          <OpenMicDates dates={view.dates} cycles={view.cycles} now={now} filtered={filtered} />
        )}
      </div>
    </div>
  );
}
