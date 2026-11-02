/** Paths where the Supabase session cookie may be refreshed. Nowhere else. */
export const SESSION_REFRESH_PREFIXES = [
  "/admin",
  "/zaloguj",
  "/auth",
  "/ulubione",
  "/konto",
] as const;

export function shouldRefreshSession(pathname: string): boolean {
  return SESSION_REFRESH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
