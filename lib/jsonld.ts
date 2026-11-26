import { cityLandingByName } from "./city-landings.ts";
import { absoluteUrl, SITE_NAME, SITE_ORIGIN } from "./seo.ts";
import { PUBLIC_SLUG } from "./slugify.ts";

export const SCHEMA_CONTEXT = "https://schema.org";
export const SCHEMA_LANGUAGE = "pl-PL";
/** Event listings are Polish. Google's event docs accept the short code. */
export const EVENT_LANGUAGE = "pl";
const WARSAW_TZ = "Europe/Warsaw";

export type JsonLdNode = Record<string, unknown>;

export type BreadcrumbItem = {
  name: string;
  url: string;
};

export type SpecialVideoInput = {
  name: string;
  description: string;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  durationSeconds: number | null;
  videoId: string | null;
  isPaid: boolean;
  pageUrl: string;
  people: readonly { name: string; slug: string }[];
};

/** ISO-8601 duration. Omitted by callers when the runtime is missing or not positive. */
export function iso8601Duration(seconds: number | null | undefined): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return null;
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  if (hours) return `PT${hours}H${minutes}M${rest}S`;
  if (minutes) return `PT${minutes}M${rest}S`;
  return `PT${rest}S`;
}

export function breadcrumbList(items: readonly BreadcrumbItem[]): JsonLdNode {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function specialBreadcrumbs(title: string, pageUrl: string): JsonLdNode {
  return breadcrumbList([
    { name: "Start", url: absoluteUrl("/") },
    { name: "Specjale", url: absoluteUrl("/specjale") },
    { name: title, url: pageUrl },
  ]);
}

function personNodes(people: readonly { name: string; slug: string }[]): JsonLdNode[] {
  return people
    .filter((person) => person.name.trim() && person.slug.trim())
    .map((person) => ({
      "@type": "Person",
      name: person.name,
      url: absoluteUrl(`/standuper/${person.slug}`),
    }));
}

/**
 * VideoObject only for a free YouTube special with a video id.
 * Paid pages and rows without a video id get no video node and no fake embedUrl.
 */
export function specialVideoObject(input: SpecialVideoInput): JsonLdNode | null {
  if (input.isPaid || !input.videoId) return null;
  const description = input.description.trim();
  if (!description) return null;
  const node: JsonLdNode = {
    "@type": "VideoObject",
    name: input.name,
    description,
    embedUrl: `https://www.youtube.com/embed/${input.videoId}`,
    contentUrl: `https://www.youtube.com/watch?v=${input.videoId}`,
    url: input.pageUrl,
    inLanguage: SCHEMA_LANGUAGE,
  };
  if (input.thumbnailUrl) node.thumbnailUrl = input.thumbnailUrl;
  if (input.publishedAt) node.uploadDate = input.publishedAt;
  const duration = iso8601Duration(input.durationSeconds);
  if (duration) node.duration = duration;
  const people = personNodes(input.people);
  if (people.length > 0) {
    node.author = people;
    node.actor = people;
  }
  return node;
}

/** `@graph` for one special page. BreadcrumbList always; VideoObject only when it is honest. */
export function specialPageGraph(input: SpecialVideoInput): JsonLdNode {
  const graph: JsonLdNode[] = [specialBreadcrumbs(input.name, input.pageUrl)];
  const video = specialVideoObject(input);
  if (video) graph.push(video);
  return {
    "@context": SCHEMA_CONTEXT,
    "@graph": graph,
  };
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

export function uniqueHttpUrls(values: readonly (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const url = httpUrl(value);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

type WarsawParts = {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
  offset: string;
};

function warsawParts(instant: Date): WarsawParts | null {
  if (Number.isNaN(instant.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: WARSAW_TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "longOffset",
  }).formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  let hour = read("hour");
  if (hour === "24") hour = "00";
  const match = read("timeZoneName").match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/i);
  if (!match) return null;
  const sign = match[1] === "-" ? "-" : "+";
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour,
    minute: read("minute"),
    second: read("second"),
    offset: `${sign}${match[2].padStart(2, "0")}:${(match[3] ?? "00").padStart(2, "0")}`,
  };
}

/**
 * ISO-8601 start in Europe/Warsaw. Midnight wall time is a date with no clock.
 * A known hour is never left as `Z`.
 */
export function warsawSchemaStart(iso: string): string | null {
  const parts = warsawParts(new Date(iso));
  if (!parts) return null;
  if (parts.hour === "00" && parts.minute === "00" && parts.second === "00") {
    return `${parts.year}-${parts.month}-${parts.day}`;
  }
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${parts.offset}`;
}

const POSTAL_CODE = /\b(\d{2}-\d{3})\b/;

/**
 * PostalAddress from a venue line. A confident split is street + XX-XXX.
 * Anything else keeps the whole line in streetAddress. City comes from the column.
 * Empty address returns null so the caller can skip Event.
 */
export function postalAddress(venueAddress: string | null | undefined, city: string): JsonLdNode | null {
  const raw = (venueAddress ?? "").trim().replace(/\s+/g, " ");
  const locality = city.trim();
  if (!raw || !locality) return null;
  const address: JsonLdNode = {
    "@type": "PostalAddress",
    addressLocality: locality,
    addressCountry: "PL",
  };
  const match = POSTAL_CODE.exec(raw);
  const street = match ? raw.slice(0, match.index).replace(/[,\s]+$/g, "").trim() : "";
  if (!match || !street || street.toLocaleLowerCase("pl") === locality.toLocaleLowerCase("pl")) {
    address.streetAddress = raw;
    return address;
  }
  address.streetAddress = street;
  address.postalCode = match[1];
  return address;
}

export type EventPerformerInput = {
  name: string;
  slug: string;
};

export type EventJsonInput = {
  id: number;
  title: string | null;
  startsAt: string;
  city: string;
  venue: string;
  venueAddress: string | null;
  priceFrom: number | null;
  currency: string;
  status: string;
  imageUrl: string | null;
  offerUrl: string | null;
  performers: readonly EventPerformerInput[];
  /** Events that have already started do not get an Event node. */
  now?: Date;
};

function schemaPrice(price: number): number {
  if (Number.isInteger(price)) return price;
  return Math.round(price * 100) / 100;
}

function performerNode(person: EventPerformerInput): JsonLdNode | null {
  const name = person.name.trim();
  if (!name) return null;
  const node: JsonLdNode = { "@type": "Person", name };
  const slug = person.slug.trim();
  if (PUBLIC_SLUG.test(slug)) node.url = absoluteUrl(`/standuper/${slug}`);
  return node;
}

/**
 * Google Event, only when the required fields are real.
 * No organizer (parska. is not the promoter), no endDate, no attendance mode.
 */
export function eventNode(input: EventJsonInput): JsonLdNode | null {
  const name = (input.title ?? "").trim();
  const venue = input.venue.trim();
  const startDate = warsawSchemaStart(input.startsAt);
  const address = postalAddress(input.venueAddress, input.city);
  const starts = new Date(input.startsAt);
  const now = input.now ?? new Date();
  if (!name || !venue || !startDate || !address) return null;
  if (Number.isNaN(starts.getTime()) || starts.getTime() <= now.getTime()) return null;

  let eventStatus: string | null = null;
  let availability: string | null = null;
  if (input.status === "on_sale" || input.status === "sold_out") {
    eventStatus = "https://schema.org/EventScheduled";
    availability = input.status === "on_sale" ? "https://schema.org/InStock" : "https://schema.org/SoldOut";
  } else if (input.status === "cancelled") {
    eventStatus = "https://schema.org/EventCancelled";
  }
  if (!eventStatus) return null;

  const node: JsonLdNode = {
    "@type": "Event",
    name,
    url: absoluteUrl(`/wystep/${input.id}`),
    startDate,
    eventStatus,
    inLanguage: EVENT_LANGUAGE,
    location: {
      "@type": "Place",
      name: venue,
      address,
    },
  };
  const image = httpUrl(input.imageUrl);
  if (image) node.image = image;

  const offerUrl = httpUrl(input.offerUrl);
  if (offerUrl && availability) {
    const offer: JsonLdNode = {
      "@type": "Offer",
      url: offerUrl,
      availability,
    };
    if (input.priceFrom != null && Number.isFinite(input.priceFrom)) {
      offer.price = schemaPrice(input.priceFrom);
      offer.priceCurrency = input.currency.trim() || "PLN";
    }
    node.offers = offer;
  }

  const performers = input.performers.flatMap((person) => {
    const nodeForPerson = performerNode(person);
    return nodeForPerson ? [nodeForPerson] : [];
  });
  if (performers.length === 1) node.performer = performers[0];
  else if (performers.length > 1) node.performer = performers;
  return node;
}

export function eventBreadcrumbItems(city: string, crumb: string, pageUrl: string): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [
    { name: "Start", url: absoluteUrl("/") },
    { name: "Trasy", url: absoluteUrl("/trasy") },
  ];
  const landing = cityLandingByName(city);
  if (landing) items.push({ name: landing.name, url: absoluteUrl(`/trasy/${landing.slug}`) });
  items.push({ name: crumb, url: pageUrl });
  return items;
}

export function eventPageGraph(input: EventJsonInput & { crumb: string; pageUrl: string }): JsonLdNode {
  const graph: JsonLdNode[] = [
    breadcrumbList(eventBreadcrumbItems(input.city, input.crumb, input.pageUrl)),
  ];
  const event = eventNode(input);
  if (event) graph.push(event);
  return { "@context": SCHEMA_CONTEXT, "@graph": graph };
}

export function homePageGraph(): JsonLdNode {
  const url = absoluteUrl("/");
  return {
    "@context": SCHEMA_CONTEXT,
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_ORIGIN}/#org`,
        name: SITE_NAME,
        url,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_ORIGIN}/#website`,
        name: SITE_NAME,
        url,
        inLanguage: SCHEMA_LANGUAGE,
        publisher: { "@id": `${SITE_ORIGIN}/#org` },
      },
    ],
  };
}

export type PersonImageLd = {
  url: string;
  width?: number | null;
  height?: number | null;
  creditText?: string | null;
  license?: string | null;
  acquireLicensePage?: string | null;
  caption?: string | null;
};

function personImageNode(image: PersonImageLd): JsonLdNode | null {
  const url = httpUrl(image.url);
  if (!url) return null;
  const node: JsonLdNode = { "@type": "ImageObject", url };
  if (typeof image.width === "number" && Number.isInteger(image.width) && image.width > 0) node.width = image.width;
  if (typeof image.height === "number" && Number.isInteger(image.height) && image.height > 0) node.height = image.height;
  const credit = image.creditText?.trim() ?? "";
  const license = httpUrl(image.license);
  const acquire = httpUrl(image.acquireLicensePage);
  const caption = image.caption?.trim() ?? "";
  if (credit) node.creditText = credit;
  if (license) node.license = license;
  if (acquire) node.acquireLicensePage = acquire;
  if (caption) node.caption = caption;
  return node;
}

export function personPageGraph(input: {
  name: string;
  slug: string;
  bio?: string | null;
  photoUrl?: string | null;
  image?: PersonImageLd | null;
  sameAs?: readonly (string | null | undefined)[];
}): JsonLdNode {
  const name = input.name.trim();
  const url = absoluteUrl(`/standuper/${input.slug}`);
  const person: JsonLdNode = {
    "@type": "Person",
    name,
    url,
  };
  const bio = input.bio?.trim() ?? "";
  if (bio) person.description = bio;
  if (input.image) {
    const imageNode = personImageNode(input.image);
    if (imageNode) person.image = imageNode;
  } else if (input.image === undefined) {
    const image = httpUrl(input.photoUrl);
    if (image) person.image = image;
  }
  const sameAs = uniqueHttpUrls(input.sameAs ?? []);
  if (sameAs.length > 0) person.sameAs = sameAs;
  return {
    "@context": SCHEMA_CONTEXT,
    "@graph": [
      person,
      breadcrumbList([
        { name: "Start", url: absoluteUrl("/") },
        { name: "Standuperzy", url: absoluteUrl("/standuperzy") },
        { name, url },
      ]),
    ],
  };
}

/** BreadcrumbList for one format page. The trail matches the visible crumbs. */
export function formatPageGraph(input: { name: string; slug: string }): JsonLdNode {
  const name = input.name.trim();
  const url = absoluteUrl(`/format/${input.slug.trim()}`);
  return {
    "@context": SCHEMA_CONTEXT,
    "@graph": [
      breadcrumbList([
        { name: "Start", url: absoluteUrl("/") },
        { name: "Formaty", url: absoluteUrl("/formaty") },
        { name, url },
      ]),
    ],
  };
}

export function cityPageGraph(name: string, pageUrl: string): JsonLdNode {
  return {
    "@context": SCHEMA_CONTEXT,
    "@graph": [
      breadcrumbList([
        { name: "Start", url: absoluteUrl("/") },
        { name: "Trasy", url: absoluteUrl("/trasy") },
        { name, url: pageUrl },
      ]),
    ],
  };
}
