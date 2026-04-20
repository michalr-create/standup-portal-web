import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { getAllCategories, getAllShows, getAllPeople } from "@/lib/data";
import MobileDrawer from "./components/MobileDrawer";
import InstallButton from "./components/InstallButton";

export const metadata: Metadata = {
  title: "parska. — polski stand-up w jednym miejscu",
  description: "Agregator polskiego stand-upu. Nowe nagrania, specjale, wywiady, formaty i trasy.",
  manifest: "/manifest.json",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [categories, shows, people] = await Promise.all([
    getAllCategories(),
    getAllShows(),
    getAllPeople(),
  ]);

  const navLinks = [
    { href: "/", label: "Start" },
    { href: "/standup", label: "Standup" },
    { href: "/formaty", label: "Formaty" },
    { href: "/wywiady", label: "Wywiady" },
    { href: "/shorts", label: "Shorts" },
  ];

  return (
    <html lang="pl">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <meta name="theme-color" content="#0B0B0B" />
      </head>
      <body>
        {/* ===== NAV ===== */}
        <nav
          className="sticky top-0 z-40 flex items-center gap-6 px-6 lg:px-10 py-4"
          style={{
            background: "rgba(11,11,11,.75)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <Link
            href="/"
            className="flex items-baseline gap-0.5 font-black text-2xl lg:text-3xl"
            style={{ letterSpacing: "-.03em" }}
          >
            parska<span className="dot-accent">.</span>
          </Link>

          {/* Desktop links */}
          <ul className="hidden md:flex gap-1 list-none p-0 m-0">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="px-3 py-2 rounded-full font-semibold text-sm transition-all hover:bg-[var(--ink-3)]"
                  style={{ color: "var(--paper-dim)" }}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex-1" />

          {/* People dropdown */}
          <div className="hidden lg:flex items-center gap-2">
            {people.slice(0, 5).map((p) => (
              <Link
                key={p.slug}
                href={`/standuper/${p.slug}`}
                className="px-2 py-1 rounded-full text-xs font-semibold transition-all hover:bg-[var(--ink-3)]"
                style={{ color: "var(--paper-mute)" }}
              >
                {p.name.split(" ").pop()}
              </Link>
            ))}
          </div>

          <InstallButton />

          {/* Mobile hamburger */}
          <MobileDrawer
            categories={categories}
            shows={shows}
            people={people}
          />
        </nav>

        {/* ===== MAIN ===== */}
        <main>{children}</main>

        {/* ===== FOOTER ===== */}
        <footer
          className="px-6 lg:px-10 pt-16 pb-10"
          style={{ background: "var(--ink-2)", borderTop: "1px solid var(--line)" }}
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 max-w-6xl mx-auto">
            <div className="md:col-span-1">
              <div
                className="font-black text-3xl mb-3"
                style={{ letterSpacing: "-.03em" }}
              >
                parska<span className="dot-accent">.</span>
              </div>
              <p
                className="text-sm leading-relaxed mb-4"
                style={{ color: "var(--paper-dim)" }}
              >
                Niezale{"\u017c"}ny agregator polskiego stand-upu.
                R{"\u0119"}cznie moderowane zestawienia nowych nagra{"\u0144"},
                specjali, wywiad{"ow"} i termin{"ow"} tras.
              </p>
              <div
                className="mono text-xs uppercase"
                style={{ color: "var(--paper-mute)", letterSpacing: ".18em" }}
              >
                parska.pl {"·"} od 2025
              </div>
            </div>

            <div>
              <h5
                className="mono text-xs uppercase mb-4"
                style={{ color: "var(--paper-mute)", letterSpacing: ".18em" }}
              >
                Tre{"\u015b"}ci
              </h5>
              <ul className="space-y-2">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm hover:text-white transition-colors"
                      style={{ color: "var(--paper-dim)" }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h5
                className="mono text-xs uppercase mb-4"
                style={{ color: "var(--paper-mute)", letterSpacing: ".18em" }}
              >
                Standuperzy
              </h5>
              <ul className="space-y-2">
                {people.slice(0, 6).map((p) => (
                  <li key={p.slug}>
                    <Link
                      href={`/standuper/${p.slug}`}
                      className="text-sm hover:text-white transition-colors"
                      style={{ color: "var(--paper-dim)" }}
                    >
                      {p.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h5
                className="mono text-xs uppercase mb-4"
                style={{ color: "var(--paper-mute)", letterSpacing: ".18em" }}
              >
                Formaty
              </h5>
              <ul className="space-y-2">
                {shows.slice(0, 6).map((s) => (
                  <li key={s.slug}>
                    <Link
                      href={`/format/${s.slug}`}
                      className="text-sm hover:text-white transition-colors"
                      style={{ color: "var(--paper-dim)" }}
                    >
                      {s.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div
            className="max-w-6xl mx-auto mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 mono text-xs uppercase"
            style={{
              borderTop: "1px solid var(--line)",
              color: "var(--paper-mute)",
              letterSpacing: ".14em",
            }}
          >
            <span>{"\u00a9"} 2026 parska.pl {"·"} r{"\u0119"}czna moderacja, codziennie</span>
            <span>Agregator tre{"\u015b"}ci. Wszystkie prawa nale{"\u017c\u0105"} do tw{"orc\u00f3w."}</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
