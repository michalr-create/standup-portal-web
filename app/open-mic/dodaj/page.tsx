import type { Metadata } from "next";
import Link from "next/link";
import OpenMicSubmitForm from "../OpenMicSubmitForm";

export const metadata: Metadata = {
  title: "Dodaj open mic — parska.",
  description: "Zgłoś cykliczny open mic stand-upowy. Sprawdzimy informacje i opublikujemy je na parska.pl.",
  alternates: { canonical: "https://parska.pl/open-mic/dodaj" },
  openGraph: {
    title: "Dodaj open mic — parska.",
    description: "Zgłoś cykliczny open mic stand-upowy. Sprawdzimy informacje i opublikujemy je na parska.pl.",
    url: "https://parska.pl/open-mic/dodaj",
    locale: "pl_PL",
    type: "website",
  },
};

export default function DodajOpenMicPage() {
  return (
    <div className="band">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8">
          <Link
            href="/open-mic"
            className="mono mb-4 inline-flex min-h-11 items-center text-xs uppercase focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]"
            style={{ color: "var(--paper-mute)", letterSpacing: ".14em" }}
          >
            ← Open mic
          </Link>
          <h1 className="m-0 font-black leading-none" style={{ fontSize: "clamp(32px, 4vw, 44px)", letterSpacing: "-.025em" }}>
            Dodaj swój open mic
            <span className="dot-accent">.</span>
          </h1>
          <p className="m-0 mt-3 text-[15px] md:text-[17px]" style={{ color: "var(--paper-dim)" }}>
            Zgłoszenie trafia do moderacji. Na stronie pojawi się dopiero po sprawdzeniu.
          </p>
        </header>
        <OpenMicSubmitForm />
      </div>
    </div>
  );
}
