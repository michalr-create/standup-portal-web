import Link from "next/link";

export default function SectionHead({
  title,
  sub,
  linkHref,
  linkText,
}: {
  title: string;
  sub?: string;
  linkHref?: string;
  linkText?: string;
}) {
  return (
    <div className="flex items-end justify-between mb-5 md:mb-6 gap-6 flex-wrap">
      <div className="flex items-baseline gap-4 flex-wrap">
        <h2 className="font-black m-0 leading-none" style={{ fontSize: "clamp(32px, 4vw, 44px)", letterSpacing: "-.025em" }}>
          {title}<span className="dot-accent">.</span>
        </h2>
        {sub && (
          <span className="mono text-xs uppercase" style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}>
            {sub}
          </span>
        )}
      </div>
      {linkHref && (
        <Link
          href={linkHref}
          className="mono text-xs uppercase pb-0.5 transition-colors hover:text-white"
          style={{ color: "var(--paper-dim)", letterSpacing: ".14em", borderBottom: "1px solid var(--line-2)" }}
        >
          {linkText}
        </Link>
      )}
    </div>
  );
}
