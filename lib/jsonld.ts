import { absoluteUrl } from "./seo.ts";

export const SCHEMA_CONTEXT = "https://schema.org";
export const SCHEMA_LANGUAGE = "pl-PL";

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
