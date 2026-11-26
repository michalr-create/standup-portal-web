import type { Metadata } from "next";
import CollectionChrome from "@/app/components/CollectionChrome";
import HeartButton from "@/app/components/HeartButton";
import JsonLd from "@/app/components/JsonLd";
import { getActivePeopleBySlugs, getApprovedItemCountsByPersonId } from "@/lib/data";
import { contentMetadata } from "@/lib/seo";
import { formatItemCount } from "@/lib/standuperzy-directory";
import {
  STANDUPERKI_DESCRIPTION,
  STANDUPERKI_FAQS,
  STANDUPERKI_H1,
  STANDUPERKI_LEAD,
  STANDUPERKI_OPEN_NOTE,
  STANDUPERKI_PATH,
  STANDUPERKI_SLUGS,
  STANDUPERKI_TITLE,
  standuperkiGraph,
  standuperkiInOrder,
} from "@/lib/standuperki";

export const revalidate = 300;

export const metadata: Metadata = contentMetadata({
  title: STANDUPERKI_TITLE,
  description: STANDUPERKI_DESCRIPTION,
  fallbackDescription: STANDUPERKI_DESCRIPTION,
  pathname: STANDUPERKI_PATH,
});

const textLink =
  "underline decoration-[var(--line-2)] underline-offset-4 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]";

const rowLink =
  "flex min-h-12 min-w-0 flex-1 flex-col justify-center rounded-xl py-3 pl-1 pr-2 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]";

export default async function StanduperkiPage() {
  const [people, counts] = await Promise.all([
    getActivePeopleBySlugs(STANDUPERKI_SLUGS),
    getApprovedItemCountsByPersonId(),
  ]);
  const ordered = standuperkiInOrder(people);

  return (
    <>
      <JsonLd data={standuperkiGraph(ordered)} />
      <CollectionChrome
        h1={STANDUPERKI_H1}
        crumbs={[
          { href: "/", label: "Start" },
          { href: "/standuperzy", label: "Standuperzy" },
          { label: "Standuperki" },
        ]}
        intro={
          <>
            <p className="m-0">{STANDUPERKI_LEAD}</p>
            <p className="m-0 mt-3">
              {STANDUPERKI_OPEN_NOTE}
              {" Pełny katalog osób jest na "}
              <a href="/standuperzy" className={textLink}>
                stronie wszystkich standuperów
              </a>
              .
            </p>
          </>
        }
        faqs={STANDUPERKI_FAQS.map((faq) => ({
          question: faq.question,
          answer: faq.answer,
        }))}
      >
        {ordered.length === 0 ? (
          <p className="py-16 text-center" style={{ color: "var(--paper-mute)" }}>
            Nie ma jeszcze profili na tej liście.
          </p>
        ) : (
          <ul className="m-0 max-w-xl list-none p-0" aria-label="Lista standuperki">
            {ordered.map((person) => {
              const countText = formatItemCount(counts.get(person.id) ?? 0);
              return (
                <li key={person.id} style={{ borderBottom: "1px solid var(--line)" }}>
                  <div className="flex items-center gap-1">
                    <a href={`/standuper/${person.slug}`} className={rowLink}>
                      <span className="text-base font-bold leading-snug" style={{ color: "var(--paper)" }}>
                        {person.name}
                      </span>
                      {countText ? (
                        <span className="mono mt-0.5 text-xs" style={{ color: "var(--paper-mute)" }}>
                          {countText}
                        </span>
                      ) : null}
                    </a>
                    <HeartButton type="person" slug={person.slug} name={person.name} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CollectionChrome>
    </>
  );
}
