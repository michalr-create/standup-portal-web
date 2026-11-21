/** A logout POST must come from this site. A cross-site form would still send the cookie. */
export function isSameOriginSignOut(input: {
  origin: string | null;
  referer: string | null;
  requestOrigin: string;
}): boolean {
  const origin = input.origin?.trim();
  if (origin) return origin === input.requestOrigin;
  const referer = input.referer?.trim();
  if (!referer) return false;
  try {
    return new URL(referer).origin === input.requestOrigin;
  } catch {
    return false;
  }
}
