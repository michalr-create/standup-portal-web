import Link from "next/link";

const LINKS = [
  { href: "/", label: "Start", primary: true },
  { href: "/szukaj", label: "Szukaj", primary: false },
  { href: "/standuperzy", label: "Standuperzy", primary: false },
  { href: "/formaty", label: "Formaty", primary: false },
] as const;

export default function NotFound() {
  return (
    <div className="band">
      <div className="mx-auto max-w-xl py-6 text-center sm:py-12">
        <p
          className="mono mb-3 text-xs uppercase"
          style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}
        >
          404
        </p>
        <h1
          className="m-0 font-black leading-[0.95]"
          style={{ fontSize: "clamp(32px, 6vw, 56px)", letterSpacing: "-.03em" }}
        >
          Nie ma takiej strony
          <span className="dot-accent">.</span>
        </h1>
        <p
          className="mx-auto mt-4 mb-0 max-w-md text-base leading-relaxed"
          style={{ color: "var(--paper-dim)" }}
        >
          Ten adres nie prowadzi do nagrania, standupera ani formatu.
        </p>
        <nav aria-label="Gdzie dalej" className="mt-8 flex flex-wrap justify-center gap-3">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                link.primary
                  ? "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-[var(--coral)] px-5 text-sm font-black text-[var(--ink)] transition-colors hover:bg-[var(--coral-hi)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--paper)]"
                  : "chip inline-flex min-h-11 min-w-11 items-center justify-center px-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]"
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
