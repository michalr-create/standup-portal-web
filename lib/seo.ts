import type { Metadata, MetadataRoute } from "next";
import { CITY_LANDINGS } from "./city-landings.ts";
import { OPEN_MIC_CITIES } from "./open-mic-cities.ts";
import { isPublicContentSlug, PUBLIC_SLUG } from "./slugify.ts";

/** Canonical origin. Public URLs stay on the apex host, never www. */
export const SITE_ORIGIN = "https://parska.pl";
export const SITE_NAME = "parska.";
export const SITE_LOCALE = "pl_PL";

export const HOME_TITLE = "parska. \u2014 polski stand-up w jednym miejscu";
export const HOME_DESCRIPTION =
  "Wyst\u0119py, nagrania i open miki polskiego stand-upu w jednym miejscu.";
export const TITLE_TEMPLATE = "%s \u2014 parska.";

/** Brand card when a page has no portrait, thumbnail, or poster of its own. */
export const OG_DEFAULT_IMAGE = {
  url: "/og-default.png",
  width: 1200,
  height: 630,
  alt: "parska. \u2014 ca\u0142y polski stand-up w jednym miejscu",
} as const;

const META_DESCRIPTION_MAX = 160;

/** ASCII leftovers in category descriptions stored without Polish diacritics. */
const BROKEN_DIACRITICS: Record<string, string> = {
  Krotkie: "Kr\u00f3tkie",
  krotkie: "kr\u00f3tkie",
  wystepow: "wyst\u0119p\u00f3w",
  materialy: "materia\u0142y",
};

export const ROBOTS_DISALLOW = [
  "/admin",
  "/admin/",
  "/zaloguj",
  "/auth/",
  "/ulubione",
  "/ulubione/",
  "/konto/",
  "/api/",
  "/debug",
  "/szukaj",
  "/zglos",
  "/open-mic/dodaj",
] as const;

export const SITEMAP_STATIC_PATHS = [
  "/",
  "/standup",
  "/specjale",
  "/specjale/2026",
  "/specjale/najlepsze",
  "/formaty",
  "/wywiady",
  "/shorts",
  "/kulisy",
  "/roast",
  "/standuperzy",
  "/standuperki",
  "/trasy",
  "/rankingi",
  "/nostalgia",
  "/open-mic",
] as const;

const SITEMAP_BLOCKED = new Set<string>([
  "/ulubione",
  "/open-mic/dodaj",
  "/szukaj",
  "/zaloguj",
  "/admin",
  "/zglos",
  "/debug",
]);

export const NOINDEX_ROBOTS = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false },
} as const;

export type SitemapChangeFrequency = "daily" | "weekly";

export type SitemapEntry = {
  url: string;
  changeFrequency: SitemapChangeFrequency;
  priority: number;
  lastModified?: string;
};

export type SitemapSpecial = {
  slug: string;
  lastModified?: string | null;
};

export function fixBrokenDiacritics(text: string): string {
  return text.replace(/\b(Krotkie|krotkie|wystepow|materialy)\b/g, (word) => BROKEN_DIACRITICS[word] ?? word);
}

export function clipDescription(
  text: string | null | undefined,
  fallback: string,
  max = META_DESCRIPTION_MAX,
): string {
  const normalized = fixBrokenDiacritics((text ?? "").replace(/\s+/g, " ").trim());
  const chosen = normalized || fixBrokenDiacritics(fallback.replace(/\s+/g, " ").trim());
  if (chosen.length <= max) return chosen;
  return chosen.slice(0, max).trimEnd();
}

/** Positive listing page. Missing, `1`, and invalid values stay on page 1. */
export function pageFromSearch(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value == null || !/^[1-9]\d{0,4}$/.test(value)) return 1;
  const page = Number(value);
  return page > 1 ? page : 1;
}

export function absoluteUrl(pathname: string): string {
  if (pathname === "/" || pathname === "") return `${SITE_ORIGIN}/`;
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const [bare] = path.split("?");
  return `${SITE_ORIGIN}${bare.replace(/\/+$/, "")}`;
}

/**
 * Self-referencing pagination canonical.
 * Page 1 is the clean path. Page N is the same path plus `?page=N`.
 * Facet params are omitted, so filtered views share that page's canonical.
 */
export function listingCanonical(pathname: string, page = 1): string {
  const url = absoluteUrl(pathname);
  if (!Number.isFinite(page) || page <= 1) return url;
  return `${url}?page=${Math.floor(page)}`;
}

/** Document titles use the layout template. Open Graph and Twitter titles do not, so they get the suffix here. */
export function withSiteTitle(title: string): string {
  return TITLE_TEMPLATE.replace("%s", title);
}

type ContentMetadataInput = {
  title: string;
  description?: string | null;
  fallbackDescription: string;
  pathname: string;
  page?: number;
  openGraphType?: "website" | "profile" | "video.other";
  image?: string | null;
  /**
   * Keep an approved description that is already final.
   * Open-mic city templates are 162–167 characters; clipping them at 160
   * would cut the last sentence. Every other page stays clipped.
   */
  preserveDescription?: boolean;
};

function absoluteImage(image: string | null | undefined): string | null {
  const value = image?.trim() ?? "";
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return absoluteUrl(value);
  return null;
}

export function contentMetadata(input: ContentMetadataInput): Metadata {
  const preserved = fixBrokenDiacritics((input.description ?? "").replace(/\s+/g, " ").trim());
  const description = input.preserveDescription
    ? preserved || clipDescription(null, input.fallbackDescription)
    : clipDescription(input.description, input.fallbackDescription);
  const url = listingCanonical(input.pathname, input.page ?? 1);
  const socialTitle = withSiteTitle(input.title);
  const image = absoluteImage(input.image);
  const images = image ? [{ url: image }] : [OG_DEFAULT_IMAGE];
  return {
    // Absolute so the layout template cannot append a second " — parska.".
    title: { absolute: socialTitle },
    description,
    alternates: { canonical: url },
    openGraph: {
      type: input.openGraphType ?? "website",
      locale: SITE_LOCALE,
      url,
      siteName: SITE_NAME,
      title: socialTitle,
      description,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images,
    },
  };
}

export function specialPath(slug: string): string | null {
  if (!isPublicContentSlug(slug)) return null;
  return `/specjale/${slug}`;
}

/** Later of publication and approval, when either date parses. */
export function specialLastModified(
  publishedAt: string | null | undefined,
  approvedAt: string | null | undefined,
): string | undefined {
  const times = [publishedAt, approvedAt]
    .map((value) => (value ? Date.parse(value) : Number.NaN))
    .filter((value) => !Number.isNaN(value));
  if (times.length === 0) return undefined;
  return new Date(Math.max(...times)).toISOString();
}

function personLabel(people: readonly { name: string }[]): string | null {
  const names = people.map((person) => person.name.trim()).filter(Boolean);
  if (names.length === 0) return null;
  if (names.length === 1) return names[0] ?? null;
  if (names.length === 2) return `${names[0]}, ${names[1]}`;
  return `${names[0]} i inni`;
}

function titleMentionsPerson(title: string, name: string): boolean {
  const person = name.trim().toLowerCase();
  if (!person) return false;
  return title.toLowerCase().includes(person);
}

/** Document title without the layout's " — parska." suffix. */
export function specialDocumentTitle(title: string, people: readonly { name: string }[]): string {
  const clean = title.trim();
  const first = people[0]?.name.trim() ?? "";
  if (first && titleMentionsPerson(clean, first)) return `${clean} — specjal stand-up`;
  const label = personLabel(people);
  if (!label) return `${clean} — specjal stand-up`;
  return `${clean} — ${label} — specjal stand-up`;
}

export function specialFallbackDescription(people: readonly { name: string }[], isPaid: boolean): string {
  const label = personLabel(people);
  const who = label ? `Pełny program stand-up: ${label}.` : "Pełny program stand-up.";
  if (isPaid) return `${who} Płatny VOD — link do zakupu na parska.`;
  return `${who} Oglądaj na parska.`;
}

export function noindexMetadata(title: string, pathname: string, description?: string): Metadata {
  const url = absoluteUrl(pathname);
  const socialTitle = withSiteTitle(title);
  return {
    title: { absolute: socialTitle },
    description,
    robots: NOINDEX_ROBOTS,
    alternates: { canonical: url },
    openGraph: {
      title: socialTitle,
      description,
      url,
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
    },
  };
}

export function robotsPolicy(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [...ROBOTS_DISALLOW],
      },
    ],
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    host: SITE_ORIGIN,
  };
}

export function publicSlugs(slugs: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const slug of slugs) {
    const value = slug.trim();
    if (!PUBLIC_SLUG.test(value) || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  out.sort();
  return out;
}

export function isBlockedSitemapPath(pathname: string): boolean {
  if (pathname.includes("?")) return true;
  if (SITEMAP_BLOCKED.has(pathname)) return true;
  return (
    pathname.startsWith("/ulubione/") ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/konto/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/open-mic/dodaj")
  );
}

function sitemapPriority(pathname: string): { changeFrequency: SitemapChangeFrequency; priority: number } {
  if (pathname === "/") return { changeFrequency: "daily", priority: 1 };
  if (pathname === "/open-mic") return { changeFrequency: "daily", priority: 0.8 };
  if (pathname.startsWith("/open-mic/")) return { changeFrequency: "weekly", priority: 0.7 };
  if (pathname === "/trasy") return { changeFrequency: "daily", priority: 0.6 };
  if (pathname.startsWith("/trasy/")) return { changeFrequency: "weekly", priority: 0.7 };
  if (pathname.startsWith("/wystep/")) return { changeFrequency: "daily", priority: 0.5 };
  if (pathname.startsWith("/specjale/")) return { changeFrequency: "weekly", priority: 0.7 };
  return { changeFrequency: "weekly", priority: 0.6 };
}

function specialSitemapRows(specials: readonly (string | SitemapSpecial)[]): { pathname: string; lastModified?: string }[] {
  const seen = new Set<string>();
  const rows: { pathname: string; lastModified?: string }[] = [];
  for (const entry of specials) {
    const slug = typeof entry === "string" ? entry : entry.slug;
    const pathname = specialPath(typeof slug === "string" ? slug.trim() : "");
    if (!pathname || seen.has(pathname)) continue;
    seen.add(pathname);
    const lastModified = typeof entry === "string" ? undefined : specialLastModified(entry.lastModified, null);
    rows.push(lastModified ? { pathname, lastModified } : { pathname });
  }
  rows.sort((a, b) => a.pathname.localeCompare(b.pathname));
  return rows;
}

function eventSitemapPaths(ids: readonly number[]): string[] {
  const seen = new Set<number>();
  const paths: string[] = [];
  for (const id of ids) {
    if (!Number.isSafeInteger(id) || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    paths.push(`/wystep/${id}`);
  }
  paths.sort((a, b) => Number(a.slice("/wystep/".length)) - Number(b.slice("/wystep/".length)));
  return paths;
}

function citySitemapPaths(): string[] {
  return CITY_LANDINGS.map((city) => `/trasy/${city.slug}`).sort((a, b) => a.localeCompare(b));
}

function openMicCitySitemapPaths(): string[] {
  return OPEN_MIC_CITIES.map((city) => `/open-mic/${city.slug}`).sort((a, b) => a.localeCompare(b));
}

export function buildSitemap(
  peopleSlugs: readonly string[],
  showSlugs: readonly string[],
  specials: readonly (string | SitemapSpecial)[] = [],
  eventIds: readonly number[] = [],
): SitemapEntry[] {
  const paths = [
    ...SITEMAP_STATIC_PATHS,
    ...publicSlugs(peopleSlugs).map((slug) => `/standuper/${slug}`),
    ...publicSlugs(showSlugs).map((slug) => `/format/${slug}`),
  ];
  const seen = new Set<string>();
  const entries: SitemapEntry[] = [];
  for (const pathname of paths) {
    if (isBlockedSitemapPath(pathname) || seen.has(pathname)) continue;
    seen.add(pathname);
    const cadence = sitemapPriority(pathname);
    entries.push({
      url: absoluteUrl(pathname),
      changeFrequency: cadence.changeFrequency,
      priority: cadence.priority,
    });
  }
  for (const row of specialSitemapRows(specials)) {
    if (isBlockedSitemapPath(row.pathname) || seen.has(row.pathname)) continue;
    seen.add(row.pathname);
    const cadence = sitemapPriority(row.pathname);
    entries.push({
      url: absoluteUrl(row.pathname),
      changeFrequency: cadence.changeFrequency,
      priority: cadence.priority,
      ...(row.lastModified ? { lastModified: row.lastModified } : {}),
    });
  }
  for (const pathname of [...citySitemapPaths(), ...openMicCitySitemapPaths(), ...eventSitemapPaths(eventIds)]) {
    if (isBlockedSitemapPath(pathname) || seen.has(pathname)) continue;
    seen.add(pathname);
    const cadence = sitemapPriority(pathname);
    entries.push({
      url: absoluteUrl(pathname),
      changeFrequency: cadence.changeFrequency,
      priority: cadence.priority,
    });
  }
  return entries;
}
