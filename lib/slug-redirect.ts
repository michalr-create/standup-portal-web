import { PUBLIC_SLUG } from "./slugify.ts";

/**
 * 308 target for a historical slug. Null when the request is already canonical,
 * unknown, or the stored slug is not a public path segment.
 */
export function slugRedirectPath(
  section: "standuper" | "format",
  requestedSlug: string,
  canonicalSlug: string | null | undefined,
  page = 1,
): string | null {
  if (typeof canonicalSlug !== "string" || canonicalSlug === requestedSlug) return null;
  if (!PUBLIC_SLUG.test(canonicalSlug)) return null;
  const path = `/${section}/${canonicalSlug}`;
  if (!Number.isInteger(page) || page <= 1) return path;
  return `${path}?page=${page}`;
}
