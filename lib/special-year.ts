import { itemDisplayTitle } from "./display-title.ts";
import { breadcrumbList, SCHEMA_CONTEXT, type JsonLdNode } from "./jsonld.ts";
import { topByViewCount } from "./rankings.ts";
import { absoluteUrl } from "./seo.ts";

export const SPECIALS_YEAR = 2026;
export const SPECIALS_YEAR_PATH = "/specjale/2026";
/** Short "this year" block under the full chronological list. */
export const YEAR_MOST_VIEWED_LIMIT = 8;

export const SPECIALS_YEAR_H1 = "Nowe speciale 2026";
export const SPECIALS_YEAR_TITLE = "Nowe speciale stand-up 2026 — pełne programy";
export const SPECIALS_YEAR_DESCRIPTION =
  "Polskie speciale stand-up z 2026 roku: nowe nagrania na YouTube i płatne programy w sklepach artystów. Zobacz, co ostatnio trafiło do sieci.";

export const SPECIALS_YEAR_VIEWS_HEADING = "Najchętniej oglądane w tym roku";

const WARSAW = "Europe/Warsaw";

export type YearSpecial = {
  id: number;
  slug: string;
  title: string;
  publishedAt: string | null;
  viewCount: number | null;
  externalId: string | null;
  isPaid: boolean;
};

export type SpecialYearFaq = {
  question: string;
  answer: string;
};

/** Calendar year of a publication instant in Europe/Warsaw. */
export function warsawCalendarYear(iso: string | null): number | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const year = Number(new Intl.DateTimeFormat("en-US", { timeZone: WARSAW, year: "numeric" }).format(date));
  return Number.isInteger(year) ? year : null;
}

export function newestSpecialsFirst<T extends { id: number; publishedAt: string | null }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => {
    const left = a.publishedAt ?? "";
    const right = b.publishedAt ?? "";
    if (left !== right) return right.localeCompare(left);
    return b.id - a.id;
  });
}

/**
 * Same calendar year, highest view_count first.
 * Rows without a view count stay off this block. Paid rows with a count stay on it.
 */
export function mostViewedThisYear<T extends YearSpecial>(rows: readonly T[], limit: number): T[] {
  const ranked = rows.flatMap((row) => (row.viewCount == null ? [] : [{ ...row, viewCount: row.viewCount }]));
  const size = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0;
  return topByViewCount(ranked, size);
}

export function buildSpecialsYearView<T extends YearSpecial>(rows: readonly T[], year = SPECIALS_YEAR) {
  const items = newestSpecialsFirst(rows.filter((row) => warsawCalendarYear(row.publishedAt) === year));
  return {
    year,
    items,
    mostViewed: mostViewedThisYear(items, YEAR_MOST_VIEWED_LIMIT),
    count: items.length,
    lead: specialsYearLead(items.length),
  };
}

/** First intro sentence. `count` is the year list length at render time. */
export function specialsYearLead(count: number): string {
  const n = Math.max(0, Math.trunc(count));
  return `W 2026 roku na YouTube i w sklepach artystów pojawiło się już ${n} pełnych programów stand-upowych. Tu są w jednym miejscu: od najnowszych nagrań po te, które w tym roku zebrały najwięcej wyświetleń.`;
}

export const SPECIALS_YEAR_FREE_NOTE =
  "Większość można obejrzeć za darmo. Kilka nowszych programów jest na razie tylko w płatnym sklepie artysty — przy takim tytule będzie to widać od razu. Data na tej stronie to data publikacji nagrania, nawet jeśli w tytule stoi inny rok.";

export const SPECIALS_YEAR_FAQS: readonly SpecialYearFaq[] = [
  {
    question: "Czy wszystkie programy z 2026 są za darmo?",
    answer: "Nie. Większość jest na YouTube, ale część sprzedają sami komicy.",
  },
  {
    question: "Dlaczego program z „2025” w tytule jest na tej liście?",
    answer: "Bo liczymy datę publikacji nagrania, nie rok wpisany w tytuł.",
  },
  {
    question: "Gdzie są starsze speciale?",
    answer: "Na stronie wszystkich specjali i w zestawieniu najchętniej oglądanych.",
  },
];

export function specialsYearGraph(items: readonly Pick<YearSpecial, "slug" | "title">[]): JsonLdNode {
  const pageUrl = absoluteUrl(SPECIALS_YEAR_PATH);
  const list = items.flatMap((item) => {
    const slug = item.slug.trim();
    const name = itemDisplayTitle({ title: item.title, slug });
    if (!slug || !name) return [];
    return [{ slug, name, url: absoluteUrl(`/specjale/${slug}`) }];
  });
  return {
    "@context": SCHEMA_CONTEXT,
    "@graph": [
      breadcrumbList([
        { name: "Strona główna", url: absoluteUrl("/") },
        { name: "Specjale", url: absoluteUrl("/specjale") },
        { name: "2026", url: pageUrl },
      ]),
      {
        "@type": "ItemList",
        numberOfItems: list.length,
        itemListElement: list.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          url: item.url,
          item: item.url,
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: SPECIALS_YEAR_FAQS.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
    ],
  };
}
