/** Where a ticket outlink sits. Matches the measurement spec. */
export const TICKET_PLACEMENTS = [
  "wystep_primary",
  "wystep_secondary",
  "karta_trasy_primary",
  "karta_trasy_secondary",
  "ulubione_bilety",
] as const;

export type TicketPlacement = (typeof TICKET_PLACEMENTS)[number];

/** Providers we are willing to store. `bilety24` is hidden in the UI and never logged. */
export const ANALYTICS_TICKET_PROVIDERS = [
  "kupbilecik",
  "going",
  "ebilet",
  "ticketmaster",
  "eventim",
  "biletomat",
  "other",
] as const;

export type AnalyticsTicketProvider = (typeof ANALYTICS_TICKET_PROVIDERS)[number];

const HOST_PROVIDERS: ReadonlyArray<{ provider: AnalyticsTicketProvider; hosts: readonly string[] }> = [
  { provider: "kupbilecik", hosts: ["kupbilecik.pl"] },
  { provider: "going", hosts: ["going.pl", "goingapp.pl"] },
  { provider: "ebilet", hosts: ["ebilet.pl"] },
  { provider: "ticketmaster", hosts: ["ticketmaster.pl", "ticketmaster.com"] },
  { provider: "eventim", hosts: ["eventim.pl", "eventim.de"] },
  { provider: "biletomat", hosts: ["biletomat.pl"] },
];

function hostMatches(host: string, root: string): boolean {
  return host === root || host.endsWith(`.${root}`);
}

/**
 * Map a ticket URL host to a provider for the log only.
 * Never returns `bilety24` — that host falls through to `other`.
 */
export function providerFromTicketHost(href: string): AnalyticsTicketProvider {
  try {
    const host = new URL(href).hostname.replace(/^www\./i, "").toLowerCase();
    for (const entry of HOST_PROVIDERS) {
      if (entry.hosts.some((root) => hostMatches(host, root))) return entry.provider;
    }
  } catch {
    // Invalid URLs are not a known storefront.
  }
  return "other";
}

export function analyticsTicketProvider(
  provider: string | null | undefined,
  href: string,
): AnalyticsTicketProvider {
  if (
    provider &&
    provider !== "bilety24" &&
    (ANALYTICS_TICKET_PROVIDERS as readonly string[]).includes(provider)
  ) {
    return provider as AnalyticsTicketProvider;
  }
  return providerFromTicketHost(href);
}

/** Slugs joined by `|`, capped at 255 characters. Empty when nobody has a slug. */
export function formatComedianSlugs(people: readonly { slug?: string | null }[]): string {
  const joined = people
    .map((person) => person.slug?.trim() ?? "")
    .filter(Boolean)
    .join("|");
  return joined.slice(0, 255);
}

export function isTicketPlacement(value: string): value is TicketPlacement {
  return (TICKET_PLACEMENTS as readonly string[]).includes(value);
}

/**
 * Append parska ticket UTM params without overwriting utm_* the shop already set.
 * The original path, query, and hash are kept. Invalid or non-http URLs are returned unchanged.
 */
export function withTicketUtm(
  href: string,
  input: { placement: TicketPlacement; eventId: number },
): string {
  let parsed: URL;
  try {
    parsed = new URL(href);
  } catch {
    return href;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return href;

  const hashAt = href.indexOf("#");
  const beforeHash = hashAt === -1 ? href : href.slice(0, hashAt);
  const hash = hashAt === -1 ? "" : href.slice(hashAt);
  const queryAt = beforeHash.indexOf("?");
  const path = queryAt === -1 ? beforeHash : beforeHash.slice(0, queryAt);
  const query = queryAt === -1 ? "" : beforeHash.slice(queryAt + 1);
  const existing = new URLSearchParams(query);
  const additions: string[] = [];
  const add = (key: string, value: string) => {
    if (existing.has(key)) return;
    additions.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  };
  add("utm_source", "parska");
  add("utm_medium", "referral");
  add("utm_campaign", "bilety");
  add("utm_content", input.placement);
  add("utm_term", `event-${input.eventId}`);
  if (additions.length === 0) return href;
  const nextQuery = query ? `${query}&${additions.join("&")}` : additions.join("&");
  return `${path}?${nextQuery}${hash}`;
}

export function isAnalyticsTicketProvider(value: string): value is AnalyticsTicketProvider {
  return (ANALYTICS_TICKET_PROVIDERS as readonly string[]).includes(value);
}
