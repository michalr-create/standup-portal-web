import Link from "next/link";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]";

export default function ReportMaterialLink({
  itemId,
  title,
}: {
  itemId: number;
  title: string;
}) {
  return (
    <Link
      href={`/zglos?material=${itemId}`}
      aria-label={`Zgłoś błąd przy „${title}”`}
      className={`inline-flex min-h-11 items-center text-sm font-bold ${focusRing}`}
      style={{ color: "var(--paper-mute)" }}
    >
      Zgłoś błąd
    </Link>
  );
}
