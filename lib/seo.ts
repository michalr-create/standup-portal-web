import type { Metadata, MetadataRoute } from "next";

/** Canonical origin. Public URLs stay on the apex host, never www. */
export const SITE_ORIGIN = "https://parska.pl";
export const SITE_NAME = "parska.";
export const SITE_LOCALE = "pl_PL";

export const HOME_TITLE = "parska. \u2014 polski stand-up w jednym miejscu";
export const HOME_DESCRIPTION =
  "Agregator polskiego stand-upu. Nowe nagrania, specjale, wywiady i formaty.";
export const TITLE_TEMPLATE = "%s \u2014 parska.";

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
  "/formaty",
  "/wywiady",
  "/shorts",
  "/kulisy",
  "/roast",
  "/standuperzy",
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

const PUBLIC_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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
  openGraphType?: "website" | "profile";
};

export function contentMetadata(input: ContentMetadataInput): Metadata {
  const description = clipDescription(input.description, input.fallbackDescription);
  const url = listingCanonical(input.pathname, input.page ?? 1);
  const socialTitle = withSiteTitle(input.title);
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
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
    },
  };
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
  if (pathname === "/trasy") return { changeFrequency: "daily", priority: 0.6 };
  return { changeFrequency: "weekly", priority: 0.6 };
}

export function buildSitemap(peopleSlugs: readonly string[], showSlugs: readonly string[]): SitemapEntry[] {
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
  return entries;
}
