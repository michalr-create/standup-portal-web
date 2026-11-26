import { breadcrumbList, SCHEMA_CONTEXT, type JsonLdNode } from "./jsonld.ts";
import { absoluteUrl } from "./seo.ts";

/**
 * Approved order. Not popularity, not alphabet, and not inferred from first names.
 * Missing profiles are skipped; the rest keep this sequence.
 */
export const STANDUPERKI_SLUGS = [
  "katarzyna-piasecka",
  "magda-kubicka",
  "olka-szczesniak",
  "ewa-stasiewicz",
  "wiolka-walaszczyk",
  "paulina-potocka",
  "ewa-blachnio",
  "karolina-panczyk",
  "sylwia-wiszowata",
  "marlena-mysza",
  "agnieszka-matan",
  "marta-lojek",
  "wiktoria-chachulska",
  "ola-petrus",
  "martyna-podwysocka",
  "martyna-cytryna",
  "joanna-kolaczkowska",
  "gosia-rozalska",
] as const;

const STANDUPERKI_SLUG_SET = new Set<string>(STANDUPERKI_SLUGS);

export const STANDUPERKI_PATH = "/standuperki";
export const STANDUPERKI_H1 = "Standuperki";
/** Passed to contentMetadata. The layout suffix makes the document title end with " — parska." once. */
export const STANDUPERKI_TITLE = "Standuperki — kobiety w polskim stand-upie";
export const STANDUPERKI_DOCUMENT_TITLE = "Standuperki — kobiety w polskim stand-upie — parska.";
export const STANDUPERKI_DESCRIPTION =
  "Polskie standuperki: profile, pełne programy i nagrania. Od Piaseckiej, Szczęśniak i Kubickiej po nowsze nazwiska sceny.";

/** Approved lead. Names match the meta: Piasecka, Szczęśniak, Kubicka. */
export const STANDUPERKI_LEAD = STANDUPERKI_DESCRIPTION;

export const STANDUPERKI_OPEN_NOTE = "Lista jest otwarta.";

export type StanduperkaFaq = {
  question: string;
  answer: string;
};

export const STANDUPERKI_FAQS: readonly StanduperkaFaq[] = [
  {
    question: "Czy to wszyscy?",
    answer: "Nie. To osoby, które mają profil na parska.pl. Listę można uzupełniać.",
  },
  {
    question: "Gdzie obejrzeć ich programy?",
    answer: "Przy każdej osobie są linki do pełnych nagrań, o ile takie są.",
  },
];

export function isStanduperka(slug: string): boolean {
  return STANDUPERKI_SLUG_SET.has(slug.trim().toLowerCase());
}

/** Keep the approved order. Unknown slugs and people outside the list drop out. */
export function standuperkiInOrder<T extends { slug: string }>(people: readonly T[]): T[] {
  const bySlug = new Map<string, T>();
  for (const person of people) {
    const slug = person.slug.trim().toLowerCase();
    if (!STANDUPERKI_SLUG_SET.has(slug) || bySlug.has(slug)) continue;
    bySlug.set(slug, person);
  }
  return STANDUPERKI_SLUGS.flatMap((slug) => {
    const person = bySlug.get(slug);
    return person ? [person] : [];
  });
}

export function standuperkiGraph(people: readonly { slug: string; name: string }[]): JsonLdNode {
  const pageUrl = absoluteUrl(STANDUPERKI_PATH);
  const ordered = standuperkiInOrder(people);
  return {
    "@context": SCHEMA_CONTEXT,
    "@graph": [
      breadcrumbList([
        { name: "Strona główna", url: absoluteUrl("/") },
        { name: "Standuperzy", url: absoluteUrl("/standuperzy") },
        { name: "Standuperki", url: pageUrl },
      ]),
      {
        "@type": "ItemList",
        numberOfItems: ordered.length,
        itemListElement: ordered.map((person, index) => {
          const url = absoluteUrl(`/standuper/${person.slug.trim().toLowerCase()}`);
          return {
            "@type": "ListItem",
            position: index + 1,
            name: person.name.trim(),
            url,
            item: url,
          };
        }),
      },
      {
        "@type": "FAQPage",
        mainEntity: STANDUPERKI_FAQS.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
    ],
  };
}
