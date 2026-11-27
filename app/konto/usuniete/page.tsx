import type { Metadata } from "next";
import Link from "next/link";
import { noindexMetadata } from "@/lib/seo";

export const metadata: Metadata = noindexMetadata(
  "Konto usunięte",
  "/konto/usuniete",
  "Konto w parska.pl zostało usunięte.",
);

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]";

export default function KontoUsunietePage() {
  return (
    <div className="band">
      <div className="mx-auto max-w-xl px-4 py-16">
        <p className="mono mb-3 text-xs uppercase" style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}>
          Konto
        </p>
        <h1 className="m-0 font-black leading-none" style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-.03em" }}>
          Konto usunięte
          <span className="dot-accent">.</span>
        </h1>
        <p className="mt-4 mb-0 text-base leading-relaxed" style={{ color: "var(--paper-dim)" }}>
          Konto zostało usunięte. Dane powiązane z nim w bazie — profil, ulubione, przypomnienia i powiadomienia — są usuwane razem z kontem.
        </p>
        <Link
          href="/"
          className={`mt-8 inline-flex min-h-11 items-center rounded-full px-5 text-sm font-black ${focusRing}`}
          style={{ color: "var(--ink)", background: "var(--paper)" }}
        >
          Wróć na stronę główną
        </Link>
      </div>
    </div>
  );
}
