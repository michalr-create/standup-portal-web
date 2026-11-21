/** Paths where the Supabase session cookie may be refreshed. Nowhere else. */
export const SESSION_REFRESH_PREFIXES = [
  "/admin",
  "/zaloguj",
  "/auth",
  "/ulubione",
  "/konto",
  "/zglos",
] as const;

/**
 * The sign-out route clears the session cookie on its own response.
 * Refreshing that request in middleware can write a new cookie and undo it.
 */
const SESSION_REFRESH_EXCLUSIONS = ["/auth/signout"] as const;

export function shouldRefreshSession(pathname: string): boolean {
  if (SESSION_REFRESH_EXCLUSIONS.some((path) => pathname === path)) return false;
  return SESSION_REFRESH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
