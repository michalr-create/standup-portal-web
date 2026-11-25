import Link from "next/link";
import { isPublicContentSlug } from "@/lib/slugify";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]";

/** Short text link from a paid tile to the indexable special page. */
export default function SpecialProgramLink({ slug }: { slug: string }) {
  if (!isPublicContentSlug(slug)) return null;
  return (
    <Link
      href={`/specjale/${slug}`}
      className={`inline-flex min-h-11 items-center text-sm font-bold underline-offset-4 hover:underline ${focusRing}`}
      style={{ color: "var(--coral)" }}
    >
      Strona programu
    </Link>
  );
}
