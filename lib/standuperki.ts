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
export const STANDUPERKI_TITLE = "Standuperki — polski stand-up";
export const STANDUPERKI_DESCRIPTION =
  "Standuperki na polskiej scenie stand-up. Otwarta lista profili, nie ranking najlepszych.";

export const STANDUPERKI_OPEN_NOTE =
  "To otwarta lista, nie ranking najlepszych. Kolejność nie wynika z popularności ani z alfabetu.";

export type StanduperkaFaq = {
  question: string;
  answer: string;
};

export const STANDUPERKI_FAQS: readonly StanduperkaFaq[] = [
  {
    question: "Czy to ranking najlepszych standuperki?",
    answer: "Nie. To otwarta lista profili. Nie układamy jej według ocen ani liczby wyświetleń.",
  },
  {
    question: "Dlaczego kolejność nie jest alfabetyczna?",
    answer: "Bo trzymamy ustaloną kolejność tej listy, a nie sortowanie po nazwisku albo popularności.",
  },
  {
    question: "Gdzie są pozostali standuperzy?",
    answer: "Na stronie wszystkich standuperów.",
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

/** Count sentence. The number is whoever is actually on the page. */
export function standuperkiCountSentence(count: number): string {
  const n = Math.max(0, Math.trunc(count));
  const mod10 = n % 10;
  const mod100 = n % 100;
  const word = n === 1 ? "profil" : mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 > 20) ? "profile" : "profili";
  return `Na tej stronie jest już ${n} ${word}. Zestawienie może urosnąć, gdy pojawią się kolejne profile.`;
}

export function standuperkiGraph(people: readonly { slug: string; name: string }[]): JsonLdNode {
  const pageUrl = absoluteUrl(STANDUPERKI_PATH);
  const ordered = standuperkiInOrder(people);
  return {
    "@context": SCHEMA_CONTEXT,
    "@graph": [
      breadcrumbList([
        { name: "Start", url: absoluteUrl("/") },
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
