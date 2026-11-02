const FALLBACK = "/ulubione";

/** Relative in-app path. Rejects protocol-relative and off-site targets. */
export function safeNextPath(next: string | null | undefined): string {
  if (!next) return FALLBACK;
  const value = next.trim();
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return FALLBACK;
  }

  let url: URL;
  try {
    url = new URL(value, "https://parska.pl");
  } catch {
    return FALLBACK;
  }

  if (url.origin !== "https://parska.pl") return FALLBACK;
  if (!url.pathname.startsWith("/")) return FALLBACK;
  return `${url.pathname}${url.search}${url.hash}`;
}

export function authCallbackUrl(origin: string, next?: string | null): string {
  const url = new URL("/auth/callback", origin);
  url.searchParams.set("next", safeNextPath(next));
  return url.toString();
}
