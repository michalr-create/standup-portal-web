import Link from "next/link";
import { trasyHref } from "@/lib/events";
import { profileTourLabel } from "@/lib/standuper-profile";

export default function ProfileTour({ slug, count }: { slug: string; count: number }) {
  const label = profileTourLabel(count);
  if (!label) return null;

  return (
    <div className="mt-6">
      <Link
        href={trasyHref({ osoba: slug })}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-full px-6 py-3 text-base font-black transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)] sm:w-auto"
        style={{ background: "var(--coral)", color: "var(--ink)" }}
      >
        {label}
      </Link>
    </div>
  );
}
