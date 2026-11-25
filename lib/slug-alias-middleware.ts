import { PUBLIC_SLUG } from "./slugify.ts";

/** Repeat views of the same slug skip Supabase for this long. */
export const ALIAS_REVALIDATE_SECONDS = 120;

const CACHE_MAX = 400;

export type AliasSection = "standuper" | "format";

const ALIAS_TABLE = {
  standuper: { table: "people_slug_aliases", embed: "people" },
  format: { table: "show_slug_aliases", embed: "shows" },
} as const;

type CacheEntry = { expires: number; canonical: string | null };

const memoryCache = new Map<string, CacheEntry>();

export function aliasSection(pathname: string): { section: AliasSection; slug: string } | null {
  const match = pathname.match(/^\/(standuper|format)\/([^/]+)$/);
  if (!match) return null;
  let slug = match[2];
  try {
    slug = decodeURIComponent(slug);
  } catch {
    return null;
  }
  if (!PUBLIC_SLUG.test(slug)) return null;
  const section = match[1];
  if (section !== "standuper" && section !== "format") return null;
  return { section, slug };
}

export function aliasLookupUrl(supabaseUrl: string, section: AliasSection, slug: string): string {
  const { table, embed } = ALIAS_TABLE[section];
  const origin = supabaseUrl.replace(/\/+$/, "");
  const url = new URL(`${origin}/rest/v1/${table}`);
  url.searchParams.set("slug", `eq.${slug}`);
  url.searchParams.set("select", `${embed}(slug)`);
  url.searchParams.set("limit", "1");
  return url.toString();
}

function embeddedSlug(value: unknown): string | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") return null;
  const slug = (row as { slug?: unknown }).slug;
  return typeof slug === "string" && PUBLIC_SLUG.test(slug) ? slug : null;
}

/** Current slug from a PostgREST alias row. Null when the slug is not an alias. */
export function canonicalFromAliasPayload(payload: unknown, embed: "people" | "shows"): string | null {
  const row = Array.isArray(payload) ? payload[0] : null;
  if (!row || typeof row !== "object") return null;
  return embeddedSlug((row as Record<string, unknown>)[embed]);
}

/** Absolute URL of the 308, with the original query kept. Null when there is nothing to change. */
export function aliasRedirectUrl(
  requestUrl: URL,
  section: AliasSection,
  requestedSlug: string,
  canonicalSlug: string | null,
): URL | null {
  if (!canonicalSlug || canonicalSlug === requestedSlug || !PUBLIC_SLUG.test(canonicalSlug)) return null;
  const next = new URL(requestUrl.href);
  next.pathname = `/${section}/${canonicalSlug}`;
  return next;
}

function remember(key: string, canonical: string | null, now: number): void {
  memoryCache.set(key, { expires: now + ALIAS_REVALIDATE_SECONDS * 1000, canonical });
  if (memoryCache.size <= CACHE_MAX) return;
  const oldest = memoryCache.keys().next().value;
  if (oldest) memoryCache.delete(oldest);
}

/**
 * One REST read of the alias table. A miss is cached too, so a live slug
 * does not call Supabase again until the window expires.
 * Any failure returns null and the page renders as usual.
 */
export async function lookupAliasSlug(
  section: AliasSection,
  slug: string,
  env: { url: string; key: string },
  now = Date.now(),
): Promise<string | null> {
  const key = `${section}:${slug}`;
  const cached = memoryCache.get(key);
  if (cached && cached.expires > now) return cached.canonical;

  const { embed } = ALIAS_TABLE[section];
  try {
    const response = await fetch(aliasLookupUrl(env.url, section, slug), {
      headers: {
        apikey: env.key,
        Authorization: `Bearer ${env.key}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(1500),
      next: { revalidate: ALIAS_REVALIDATE_SECONDS },
    });
    if (!response.ok) return null;
    const canonical = canonicalFromAliasPayload(await response.json(), embed);
    const target = canonical && canonical !== slug ? canonical : null;
    remember(key, target, now);
    return target;
  } catch {
    return null;
  }
}
