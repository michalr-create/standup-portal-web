import type { Metadata } from "next";
import CollectionChrome from "@/app/components/CollectionChrome";
import JsonLd from "@/app/components/JsonLd";
import RankingCards from "@/app/components/RankingCards";
import { getPublicSpecials } from "@/lib/data";
import {
  CLASSICS_HEADING,
  CLASSICS_RANKING_HREF,
  MOST_VIEWED_DESCRIPTION,
  MOST_VIEWED_FAQS,
  MOST_VIEWED_H1,
  MOST_VIEWED_LEAD,
  MOST_VIEWED_PATH,
  MOST_VIEWED_SECTIONS_NOTE,
  MOST_VIEWED_TITLE,
  TOP_YEAR_HEADING,
  TOP_YEAR_RANKING_HREF,
  cardYear,
  headlinerSentence,
  mostViewedGraph,
  rankClassicSpecials,
} from "@/lib/most-viewed-specials";
import { currentUtcYear, viewsLine } from "@/lib/rankings";
import { getRanking } from "@/lib/rankings-data";
import { contentMetadata } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = contentMetadata({
  title: MOST_VIEWED_TITLE,
  description: MOST_VIEWED_DESCRIPTION,
  fallbackDescription: MOST_VIEWED_DESCRIPTION,
  pathname: MOST_VIEWED_PATH,
});

const textLink =
  "underline decoration-[var(--line-2)] underline-offset-4 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]";

const sectionTitle = {
  fontSize: "clamp(26px, 3vw, 36px)",
  letterSpacing: "-.025em",
} as const;

export default async function MostViewedSpecialsPage() {
  const year = currentUtcYear();
  const [ranking, specials] = await Promise.all([
    getRanking({ ranking: "specjale", scope: "all", year }),
    getPublicSpecials(),
  ]);
  const yearEntries = ranking.kind === "videos" ? ranking.entries : [];
  const classics = rankClassicSpecials(
    specials.map((item) => ({
      item,
      id: item.id,
      viewCount: item.viewCount,
      externalId: item.externalId,
      isPaid: item.is_paid,
    })),
  );
  const classicEntries = classics.map((row, index) => ({
    item: row.item,
    rank: index + 1,
    viewsLabel: viewsLine(row.viewCount),
    detail: null,
    year: cardYear(row.item.published_at),
  }));
  const named = headlinerSentence(
    [...yearEntries, ...classicEntries].flatMap((entry) => entry.item.people.map((person) => person.name)),
  );

  return (
    <>
      <JsonLd
        data={mostViewedGraph({
          yearItems: yearEntries.map((entry) => ({ slug: entry.item.slug, title: entry.item.title })),
          classicItems: classicEntries.map((entry) => ({ slug: entry.item.slug, title: entry.item.title })),
        })}
      />
      <CollectionChrome
        h1={MOST_VIEWED_H1}
        crumbs={[
          { href: "/", label: "Start" },
          { href: "/specjale", label: "Specjale" },
          { label: "Najchętniej oglądane" },
        ]}
        intro={
          <>
            <p className="m-0">{MOST_VIEWED_LEAD}</p>
            <p className="m-0 mt-3">{MOST_VIEWED_SECTIONS_NOTE}</p>
            {named ? <p className="m-0 mt-3">{named}</p> : null}
            <p className="m-0 mt-3">
              {"Jeśli chcesz nowości z tego roku, a nie klasyki, zajrzyj do "}
              <a href="/specjale/2026" className={textLink}>
                specjali 2026
              </a>
              {". Wszystkie programy — także te płatne, których nie liczymy w tym zestawieniu — są w "}
              <a href="/specjale" className={textLink}>
                pełnym katalogu
              </a>
              .
            </p>
          </>
        }
        faqs={MOST_VIEWED_FAQS.map((faq) => ({ question: faq.question, answer: faq.answer }))}
      >
        <section aria-labelledby="top-specjali-roku">
          <h2 id="top-specjali-roku" className="m-0 font-black leading-none" style={sectionTitle}>
            {TOP_YEAR_HEADING}
            <span className="dot-accent">.</span>
          </h2>
          <p className="mt-2 mb-5 text-sm" style={{ color: "var(--paper-dim)" }}>
            <a href={TOP_YEAR_RANKING_HREF} className={textLink}>
              Ta sama kolejność co w rankingu specjali
            </a>
          </p>
          {yearEntries.length > 0 ? (
            <RankingCards entries={yearEntries} showCategoryBadge={false} />
          ) : (
            <p className="mb-8" style={{ color: "var(--paper-mute)" }}>
              Brak specjali z liczbą wyświetleń w tym roku.
            </p>
          )}
        </section>

        <section className="mt-12" aria-labelledby="klasyki-specjali">
          <h2 id="klasyki-specjali" className="m-0 font-black leading-none" style={sectionTitle}>
            {CLASSICS_HEADING}
            <span className="dot-accent">.</span>
          </h2>
          <p className="mt-2 mb-5 text-sm" style={{ color: "var(--paper-dim)" }}>
            <a href={CLASSICS_RANKING_HREF} className={textLink}>
              Klasyki na stronie rankingów obejmują też inne nagrania
            </a>
          </p>
          {classicEntries.length > 0 ? (
            <RankingCards entries={classicEntries} showCategoryBadge={false} />
          ) : (
            <p style={{ color: "var(--paper-mute)" }}>Brak specjali z liczbą wyświetleń.</p>
          )}
        </section>
      </CollectionChrome>
    </>
  );
}
