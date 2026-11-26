import { itemDisplayTitle } from "./display-title.ts";
import { breadcrumbList, SCHEMA_CONTEXT, type JsonLdNode } from "./jsonld.ts";
import { RANKING_LIMIT, topByViewCount, utcYear } from "./rankings.ts";
import { absoluteUrl } from "./seo.ts";
import { isPublicContentSlug } from "./slugify.ts";

export const MOST_VIEWED_PATH = "/specjale/najlepsze";
export const MOST_VIEWED_H1 = "Najchętniej oglądane polskie speciale";
export const MOST_VIEWED_TITLE = "Najchętniej oglądane polskie speciale stand-up";
export const MOST_VIEWED_DESCRIPTION =
  "Polskie speciale stand-up z największą liczbą wyświetleń na YouTube. Zestawienie z liczby odtworzeń, aktualizowane na bieżąco.";

export const TOP_YEAR_HEADING = "Top specjali roku";
export const CLASSICS_HEADING = "Klasyki wszech czasów";
export const TOP_YEAR_RANKING_HREF = "/rankingi?ranking=specjale";
export const CLASSICS_RANKING_HREF = "/rankingi?ranking=klasyki";

export const MOST_VIEWED_LEAD =
  "To nie jest plebiscyt ani lista recenzji. Układamy pełne polskie programy według liczby wyświetleń na YouTube — od nagrań, które przez lata zebrały największą publiczność, po te, które w tym roku ogląda się najczęściej.";

export const MOST_VIEWED_SECTIONS_NOTE =
  "Na stronie są dwie listy: top specjali roku oraz klasyki wszech czasów.";

export type MostViewedFaq = {
  question: string;
  answer: string;
};

export const MOST_VIEWED_FAQS: readonly MostViewedFaq[] = [
  {
    question: "Czy „najchętniej oglądane” znaczy „najlepsze”?",
    answer:
      "Nie. To tylko liczba odtworzeń na YouTube. Smak jest sprawą widza; recenzje i plebiscyty liczą się inaczej.",
  },
  {
    question: "Dlaczego nie ma tu płatnych programów?",
    answer: "Bo nie mamy dla nich porównywalnej liczby wyświetleń.",
  },
  {
    question: "Skąd biorą się liczby?",
    answer: "Z publicznego licznika YouTube, zbieranego przy nagraniach na parska.pl.",
  },
];

const HEADLINERS = [
  { genitive: "Rafała Paczesia", keys: ["paczes"] },
  { genitive: "Łukasza Lotka Lodkowskiego", keys: ["lodkowski"] },
  { genitive: "Mateusza Sochy", keys: ["socha"] },
  { genitive: "Piotra Zoli Szulowskiego", keys: ["szulowski", "zola"] },
] as const;

function fold(value: string): string {
  return value
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/** Names from the approved sentence that still appear on the lists. Others are dropped. */
export function headlinerSentence(names: readonly string[]): string | null {
  const folded = names.map(fold);
  const found = HEADLINERS.filter((person) =>
    person.keys.some((key) => folded.some((name) => name.includes(fold(key)))),
  ).map((person) => person.genitive);
  if (found.length === 0) return null;
  const last = found[found.length - 1] ?? "";
  const list = found.length === 1 ? last : `${found.slice(0, -1).join(", ")} i ${last}`;
  return `Na czele od lat zostają programy ${list}. Liczby się zmieniają, więc kolejność na tej stronie też może się przesunąć.`;
}

export type ClassicSpecial = {
  id: number;
  viewCount: number | null;
  externalId: string | null;
  isPaid: boolean;
};

/**
 * All-time specials by YouTube views. Paid rows stay off: their counts are not comparable.
 * Order matches the classics ranking rule (highest view_count, then lower id) after duplicate collapse.
 */
export function rankClassicSpecials<T extends ClassicSpecial>(
  rows: readonly T[],
  limit = RANKING_LIMIT,
): Array<T & { viewCount: number }> {
  const ranked = rows.flatMap((row) =>
    row.isPaid || row.viewCount == null ? [] : [{ ...row, viewCount: row.viewCount }],
  );
  const size = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : RANKING_LIMIT;
  return topByViewCount(ranked, size);
}

export type ListedSpecial = {
  slug: string | null;
  title: string;
  name?: string | null;
};

function listItems(items: readonly ListedSpecial[]) {
  return items.flatMap((item) => {
    const slug = item.slug?.trim() ?? "";
    if (!isPublicContentSlug(slug)) return [];
    const name = (item.name?.trim() || itemDisplayTitle({ title: item.title, slug })).trim();
    if (!name) return [];
    const url = absoluteUrl(`/specjale/${slug}`);
    return [{ name, url }];
  });
}

function itemList(name: string, items: readonly ListedSpecial[]): JsonLdNode {
  const list = listItems(items);
  return {
    "@type": "ItemList",
    name,
    numberOfItems: list.length,
    itemListElement: list.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: item.url,
      item: item.url,
    })),
  };
}

export function mostViewedGraph(input: {
  yearItems: readonly ListedSpecial[];
  classicItems: readonly ListedSpecial[];
}): JsonLdNode {
  const pageUrl = absoluteUrl(MOST_VIEWED_PATH);
  return {
    "@context": SCHEMA_CONTEXT,
    "@graph": [
      breadcrumbList([
        { name: "Strona główna", url: absoluteUrl("/") },
        { name: "Specjale", url: absoluteUrl("/specjale") },
        { name: "Najchętniej oglądane", url: pageUrl },
      ]),
      itemList(TOP_YEAR_HEADING, input.yearItems),
      itemList(CLASSICS_HEADING, input.classicItems),
      {
        "@type": "FAQPage",
        mainEntity: MOST_VIEWED_FAQS.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
    ],
  };
}

export function cardYear(publishedAt: string | null): number | null {
  return utcYear(publishedAt);
}
