import type { Metadata } from "next";
import CollectionChrome from "@/app/components/CollectionChrome";
import ItemsBrowser from "@/app/components/ItemsBrowser";
import JsonLd from "@/app/components/JsonLd";
import { getPublicSpecials } from "@/lib/data";
import { contentMetadata } from "@/lib/seo";
import {
  SPECIALS_YEAR,
  SPECIALS_YEAR_DESCRIPTION,
  SPECIALS_YEAR_FAQS,
  SPECIALS_YEAR_FREE_NOTE,
  SPECIALS_YEAR_H1,
  SPECIALS_YEAR_PATH,
  SPECIALS_YEAR_TITLE,
  SPECIALS_YEAR_VIEWS_HEADING,
  buildSpecialsYearView,
  specialsYearGraph,
} from "@/lib/special-year";

export const revalidate = 120;

export const metadata: Metadata = contentMetadata({
  title: SPECIALS_YEAR_TITLE,
  description: SPECIALS_YEAR_DESCRIPTION,
  fallbackDescription: SPECIALS_YEAR_DESCRIPTION,
  pathname: SPECIALS_YEAR_PATH,
});

const textLink =
  "underline decoration-[var(--line-2)] underline-offset-4 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]";

export default async function SpecialsYearPage() {
  const all = await getPublicSpecials();
  const view = buildSpecialsYearView(
    all.map((item) => ({
      id: item.id,
      slug: item.slug,
      title: item.title,
      publishedAt: item.published_at,
      viewCount: item.viewCount,
      externalId: item.externalId,
      isPaid: item.is_paid,
    })),
    SPECIALS_YEAR,
  );
  const byId = new Map(all.map((item) => [item.id, item]));
  const items = view.items.flatMap((row) => {
    const item = byId.get(row.id);
    return item ? [item] : [];
  });
  const mostViewed = view.mostViewed.flatMap((row) => {
    const item = byId.get(row.id);
    return item ? [item] : [];
  });

  return (
    <>
      <JsonLd data={specialsYearGraph(view.items)} />
      <CollectionChrome
        h1={SPECIALS_YEAR_H1}
        crumbs={[
          { href: "/", label: "Start" },
          { href: "/specjale", label: "Specjale" },
          { label: "2026" },
        ]}
        intro={
          <>
            <p className="m-0">{view.lead}</p>
            <p className="m-0 mt-3">{SPECIALS_YEAR_FREE_NOTE}</p>
            <p className="m-0 mt-3">
              {"Starsze programy i pełny katalog są na "}
              <a href="/specjale" className={textLink}>
                stronie wszystkich specjali
              </a>
              {". Jeśli szukasz występów na żywo, zajrzyj do "}
              <a href="/trasy" className={textLink}>
                terminów
              </a>
              {". "}
              <a href="/specjale/najlepsze" className={textLink}>
                Najchętniej oglądane programy
              </a>
              {" są na osobnej liście."}
            </p>
          </>
        }
        faqs={SPECIALS_YEAR_FAQS.map((faq) => ({
          question: faq.question,
          answer: faq.question.startsWith("Gdzie") ? (
            <>
              {"Na "}
              <a href="/specjale" className={textLink}>
                stronie wszystkich specjali
              </a>
              {" i w "}
              <a href="/specjale/najlepsze" className={textLink}>
                zestawieniu najchętniej oglądanych
              </a>
              .
            </>
          ) : (
            faq.answer
          ),
        }))}
      >
        <ItemsBrowser items={items} />
        {mostViewed.length > 0 ? (
          <section className="mt-12" aria-labelledby="najchetniej-w-tym-roku">
            <h2
              id="najchetniej-w-tym-roku"
              className="m-0 mb-5 font-black leading-none"
              style={{ fontSize: "clamp(24px, 3vw, 32px)", letterSpacing: "-.025em" }}
            >
              {SPECIALS_YEAR_VIEWS_HEADING}
              <span className="dot-accent">.</span>
            </h2>
            <ItemsBrowser items={mostViewed} />
          </section>
        ) : null}
      </CollectionChrome>
    </>
  );
}
