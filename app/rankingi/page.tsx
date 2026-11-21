import type { Metadata } from "next";
import Link from "next/link";
import RankingCards from "@/app/components/RankingCards";
import { getRanking } from "@/lib/rankings-data";
import {
  MIN_PERCENT_BASE,
  RANKING_IDS,
  RANKING_LABELS,
  currentUtcYear,
  parseRankingQuery,
  rankingHref,
  type RankingId,
} from "@/lib/rankings";
import { formatViews } from "@/lib/view-count";
import { RankingPeople, RankingShows } from "./RankingLists";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Rankingi Top 10 \u2014 parska.",
  description: "Hity tygodnia, klasyki, nowo\u015bci i najch\u0119tniej ogl\u0105dani standuperzy.",
};

const NOTES: Record<RankingId, string> = {
  hity: "Przyrost od najstarszego pomiaru w oknie.",
  zyskujace: `Minimum ${formatViews(MIN_PERCENT_BASE)} na starcie okna.`,
  klasyki: "Bez Shorts i bez scalonych duplikat\u00f3w.",
  nowosci: "Opublikowane w ostatnich 30 dniach.",
  specjale: "Pe\u0142ne programy z tagiem Special.",
  standuperzy: "Suma wy\u015bwietle\u0144 standup\u00f3w i specjali.",
  programy: "Materia\u0142y z tagiem Special.",
  formaty: "Suma wy\u015bwietle\u0144 odcink\u00f3w.",
};

const pillClass = "inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold whitespace-nowrap";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RankingiPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = parseRankingQuery(params);
  const currentYear = currentUtcYear();
  const data = await getRanking(query);
  const years = data.kind === "videos"
    ? [...new Set([query.year, ...data.years])].sort((a, b) => b - a)
    : [];

  return (
    <div className="band">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h1
            className="font-black m-0 leading-none"
            style={{ fontSize: "clamp(32px, 4vw, 44px)", letterSpacing: "-.025em" }}
          >
            Rankingi Top 10<span className="dot-accent">.</span>
          </h1>
          <p className="mt-3 max-w-2xl" style={{ color: "var(--paper-dim)", fontSize: "17px" }}>
            {"Zestawienia z liczby wy\u015bwietle\u0144. Hity i zyskuj\u0105ce licz\u0105 przyrost, reszta \u2014 stan na dzi\u015b."}
          </p>
        </header>

        <nav aria-label="Zestawienia" className="mb-6 flex flex-wrap gap-2">
          {RANKING_IDS.map((id) => {
            const active = id === query.ranking;
            return (
              <Link
                key={id}
                href={rankingHref({ ranking: id, scope: query.scope, year: query.year }, currentYear)}
                aria-current={active ? "page" : undefined}
                className={pillClass}
                style={active
                  ? { background: "var(--coral)", color: "var(--ink)" }
                  : { background: "var(--ink-3)", color: "var(--paper-dim)" }}
              >
                {RANKING_LABELS[id]}
              </Link>
            );
          })}
        </nav>

        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2
              className="font-black m-0 leading-none"
              style={{ fontSize: "clamp(26px, 3vw, 36px)", letterSpacing: "-.025em" }}
            >
              {data.heading}
              <span className="dot-accent">.</span>
            </h2>
            <p className="mt-2" style={{ color: "var(--paper-dim)" }}>
              {NOTES[query.ranking]}
            </p>
          </div>
          {query.ranking === "hity" && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Zakres hit\u00f3w">
              <ScopeLink
                href={rankingHref({ ranking: "hity", scope: "all" }, currentYear)}
                active={query.scope === "all"}
                label="Wszystko"
              />
              <ScopeLink
                href={rankingHref({ ranking: "hity", scope: "standup_special" }, currentYear)}
                active={query.scope === "standup_special"}
                label="Standup i specjale"
              />
            </div>
          )}
        </div>

        {query.ranking === "specjale" && years.length > 0 && (
          <nav aria-label="Rok specjali" className="mb-6 flex flex-wrap gap-2">
            {years.map((year) => {
              const active = year === query.year;
              return (
                <Link
                  key={year}
                  href={rankingHref({ ranking: "specjale", year }, currentYear)}
                  aria-current={active ? "page" : undefined}
                  className={pillClass}
                  style={active
                    ? { background: "var(--paper)", color: "var(--ink)" }
                    : { background: "transparent", color: "var(--paper-dim)", border: "1px solid var(--line-2)" }}
                >
                  {year}
                </Link>
              );
            })}
          </nav>
        )}

        {data.kind === "videos" && data.pending && (
          <p className="py-16 text-center text-lg" style={{ color: "var(--paper)" }}>
            Ranking ruszy jutro.
          </p>
        )}
        {data.kind === "videos" && !data.pending && data.entries.length === 0 && (
          <p className="py-16 text-center" style={{ color: "var(--paper-mute)" }}>
            {"Brak pozycji w tym zestawieniu."}
          </p>
        )}
        {data.kind === "videos" && !data.pending && data.entries.length > 0 && (
          <RankingCards entries={data.entries} />
        )}
        {data.kind === "people" && data.people.length === 0 && (
          <p className="py-16 text-center" style={{ color: "var(--paper-mute)" }}>
            {"Brak os\u00f3b w tym zestawieniu."}
          </p>
        )}
        {data.kind === "people" && data.people.length > 0 && (
          <RankingPeople people={data.people} />
        )}
        {data.kind === "shows" && data.shows.length === 0 && (
          <p className="py-16 text-center" style={{ color: "var(--paper-mute)" }}>
            {"Brak format\u00f3w w tym zestawieniu."}
          </p>
        )}
        {data.kind === "shows" && data.shows.length > 0 && (
          <RankingShows shows={data.shows} />
        )}
      </div>
    </div>
  );
}

function ScopeLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={pillClass}
      style={active
        ? { background: "var(--paper)", color: "var(--ink)" }
        : { background: "transparent", color: "var(--paper-dim)", border: "1px solid var(--line-2)" }}
    >
      {label}
    </Link>
  );
}
