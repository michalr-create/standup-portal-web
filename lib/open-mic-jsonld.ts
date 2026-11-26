import {
  breadcrumbList,
  postalAddress,
  SCHEMA_CONTEXT,
  warsawSchemaStart,
  type BreadcrumbItem,
  type JsonLdNode,
} from "./jsonld.ts";
import type { OpenMicCycle, OpenMicDate, OpenMicLanguage } from "./open-mics.ts";

const IN_STOCK = "https://schema.org/InStock";
const SOLD_OUT = "https://schema.org/SoldOut";
const SCHEDULED = "https://schema.org/EventScheduled";

export type OpenMicFaqInput = {
  question: string;
  answer: string;
};

/**
 * Audience admission from `audience_price_text`.
 * Free is only an unambiguous "wstęp wolny" (or a parsed ticket price of 0).
 * An open mic is not free by default. "od", ranges and two ticket prices are not a single number.
 */
export function openMicAdmission(text: string | null | undefined): { free: boolean; price: number | null } {
  if (isUnambiguousFreeAdmission(text)) return { free: true, price: null };
  const price = reliableTicketPrice(text);
  if (price === 0) return { free: true, price: 0 };
  return { free: false, price };
}

function normalizePriceText(text: string | null | undefined): string {
  return (text ?? "").trim().toLocaleLowerCase("pl").replace(/\s+/g, " ");
}

function isUnambiguousFreeAdmission(text: string | null | undefined): boolean {
  const value = normalizePriceText(text);
  if (!value) return false;
  if (/\bbilet\b/.test(value) && /\d/.test(value)) return false;
  if (/\bwidzowie\b/.test(value) && /\d/.test(value)) return false;
  return (
    /^wstęp wolny(?:$|[\s,(])/.test(value) ||
    /^wstęp bezpłatny(?:$|[\s,(])/.test(value) ||
    /^wstęp darmowy(?:$|[\s,(])/.test(value) ||
    /^(?:free admission|free entry)(?:$|[\s,(])/.test(value)
  );
}

function reliableTicketPrice(text: string | null | undefined): number | null {
  const value = (text ?? "").trim().replace(/\s+/g, " ");
  if (!value) return null;
  const strict = value.match(/^bilet (\d{1,4}) zł(?: przy wejściu|\s*\([^)]*\))?$/i);
  if (strict) return Number(strict[1]);
  const folded = value.toLocaleLowerCase("pl");
  if (/\bod\b/.test(folded)) return null;
  if (/\d\s*[–-]\s*\d/.test(value)) return null;
  const amounts = [...value.matchAll(/(\d{1,4})\s*zł/gi)];
  if (amounts.length !== 1) return null;
  if (!/^bilet \d{1,4} zł(?=$|[\s,.;])/i.test(value)) return null;
  return Number(amounts[0]?.[1]);
}

function httpUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return trimmed;
  } catch {
    return null;
  }
}

/** Never the portal. Empty and parska. / parska.pl are omitted. */
export function openMicOrganizerName(name: string | null | undefined): string | null {
  const trimmed = name?.trim().replace(/\s+/g, " ") ?? "";
  if (!trimmed) return null;
  const key = trimmed.toLocaleLowerCase("pl").replace(/\.+$/, "").trim();
  if (/\bparska(?:\.pl)?\b/.test(key)) return null;
  return trimmed;
}

function eventLanguage(language: OpenMicLanguage | null | undefined): string | string[] | undefined {
  if (language === "pl") return "pl";
  if (language === "en") return "en";
  if (language === "pl/en") return ["pl", "en"];
  return undefined;
}

function sameCity(left: string | null | undefined, right: string | null | undefined): boolean {
  const a = left?.trim().toLocaleLowerCase("pl") ?? "";
  const b = right?.trim().toLocaleLowerCase("pl") ?? "";
  if (!a || !b) return true;
  return a === b;
}

function placeAddress(address: string | null | undefined, city: string): JsonLdNode {
  const line = address?.trim() ?? "";
  const parsed = line ? postalAddress(line, city) : null;
  if (parsed) return parsed;
  return {
    "@type": "PostalAddress",
    addressLocality: city,
    addressCountry: "PL",
  };
}

/**
 * One Event for one future listed date. No node for a past date, a cancelled
 * date, or a row without a venue and a city. Missing street does not drop the venue.
 */
export function openMicEventNode(input: {
  date: OpenMicDate;
  cycle: OpenMicCycle | null;
  pageUrl: string;
  now: Date;
}): JsonLdNode | null {
  const { date, cycle, now } = input;
  if (date.status !== "on_sale" && date.status !== "sold_out" && date.status !== "unknown") return null;
  const starts = new Date(date.starts_at);
  if (Number.isNaN(starts.getTime()) || starts.getTime() < now.getTime()) return null;
  const startDate = warsawSchemaStart(date.starts_at);
  const name = date.title?.trim() || cycle?.name?.trim() || "";
  const venue = (date.venue ?? cycle?.venue ?? "").trim();
  const city = (date.city ?? cycle?.city ?? "").trim();
  if (!name || !startDate || !venue || !city) return null;

  const admission = openMicAdmission(cycle?.audience_price_text);
  const node: JsonLdNode = {
    "@type": "Event",
    name,
    url: input.pageUrl,
    startDate,
    eventStatus: SCHEDULED,
    location: {
      "@type": "Place",
      name: venue,
      address: placeAddress(sameCity(date.city, cycle?.city) ? cycle?.address : null, city),
    },
  };
  const language = eventLanguage(cycle?.language);
  if (language) node.inLanguage = language;
  if (admission.free) node.isAccessibleForFree = true;

  const organizer = openMicOrganizerName(cycle?.organizer);
  if (organizer) node.organizer = { "@type": "Organization", name: organizer };

  if (date.status === "on_sale" || date.status === "sold_out") {
    const availability = date.status === "on_sale" ? IN_STOCK : SOLD_OUT;
    const offerUrl = httpUrl(date.url);
    const offer: JsonLdNode = { "@type": "Offer", availability };
    if (offerUrl) offer.url = offerUrl;
    if (admission.free) {
      offer.price = 0;
      offer.priceCurrency = "PLN";
      node.offers = offer;
    } else if (admission.price != null) {
      offer.price = admission.price;
      offer.priceCurrency = "PLN";
      node.offers = offer;
    } else if (offerUrl) {
      node.offers = offer;
    }
  }

  return node;
}

export function openMicEventNodes(
  cycles: readonly OpenMicCycle[],
  dates: readonly OpenMicDate[],
  pageUrl: string,
  now: Date,
): JsonLdNode[] {
  const byId = new Map(cycles.map((cycle) => [cycle.id, cycle]));
  const nodes: JsonLdNode[] = [];
  for (const date of dates) {
    const cycle = date.open_mic_id == null ? null : (byId.get(date.open_mic_id) ?? null);
    const node = openMicEventNode({ date, cycle, pageUrl, now });
    if (node) nodes.push(node);
  }
  return nodes;
}

export function faqPageNode(faqs: readonly OpenMicFaqInput[]): JsonLdNode | null {
  const mainEntity = faqs.flatMap((item) => {
    const question = item.question.trim();
    const answer = item.answer.trim();
    if (!question || !answer) return [];
    return [
      {
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      },
    ];
  });
  if (mainEntity.length === 0) return null;
  return { "@type": "FAQPage", mainEntity };
}

export function openMicPageGraph(input: {
  pageUrl: string;
  cycles: readonly OpenMicCycle[];
  dates: readonly OpenMicDate[];
  now: Date;
  faqs?: readonly OpenMicFaqInput[];
  breadcrumbs?: readonly BreadcrumbItem[];
}): JsonLdNode {
  const graph: JsonLdNode[] = [];
  if (input.breadcrumbs && input.breadcrumbs.length > 0) graph.push(breadcrumbList(input.breadcrumbs));
  graph.push(...openMicEventNodes(input.cycles, input.dates, input.pageUrl, input.now));
  const faq = faqPageNode(input.faqs ?? []);
  if (faq) graph.push(faq);
  return { "@context": SCHEMA_CONTEXT, "@graph": graph };
}
