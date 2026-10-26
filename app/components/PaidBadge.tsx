import { cardActionKind, PAID_BADGE_LABEL, PAID_UNAVAILABLE_LABEL } from "@/lib/youtube";

const chipClass =
  "absolute bottom-2.5 left-2.5 z-[2] inline-flex items-center gap-1 rounded-md px-2 py-1 font-extrabold whitespace-nowrap";

const chipStyle = { fontSize: "13px", lineHeight: 1.15 } as const;

export default function PaidBadge({ url }: { url: string | null }) {
  if (cardActionKind(true, url) === "unavailable") {
    return (
      <span
        className={chipClass}
        style={{ ...chipStyle, background: "rgba(11,11,11,.8)", color: "var(--paper)" }}
      >
        {PAID_UNAVAILABLE_LABEL}
      </span>
    );
  }

  return (
    <span
      className={chipClass}
      style={{ ...chipStyle, background: "var(--coral)", color: "var(--ink)" }}
    >
      <span aria-hidden="true">$</span>
      {PAID_BADGE_LABEL}
      <span aria-hidden="true">↗</span>
    </span>
  );
}
