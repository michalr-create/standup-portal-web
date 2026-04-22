import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { getAllCategories, getAllShows, getAllPeople } from "@/lib/data";
import MobileDrawer from "./components/MobileDrawer";
import InstallButton from "./components/InstallButton";

export const metadata: Metadata = {
  title: "parska. \u2014 polski stand-up w jednym miejscu",
  description: "Agregator polskiego stand-upu. Nowe nagrania, specjale, wywiady, formaty i trasy.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.svg" },
      { url: "/favicon-180.png", sizes: "180x180" },
    ],
  },
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
    { href: "/kulisy", label: "Kulisy" },
    { href: "/standuperzy", label: "Standuperzy" },
    { href: "/ulubione", label: "Ulubione" },
  ];

  return (
    <html lang="pl">
      <head>
        <meta name="theme-color" content="#0B0B0B" />
      </head>
      <body>
        {/* NAV */}
        <nav
          className="sticky top-0 z-40 flex items-center gap-4 lg:gap-6 px-4 lg:px-10 py-3 lg:py-4"
          style={{
            background: "rgba(11,11,11,.75)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <Link
            href="/"
            className="flex items-baseline gap-0.5 font-black text-2xl lg:text-3xl shrink-0"
            style={{ letterSpacing: "-.03em" }}
          >
            parska<span className="dot-accent">.</span>
          </Link>

          <ul className="hidden md:flex gap-1 list-none p-0 m-0">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="px-3 py-2 rounded-full font-semibold text-sm transition-all hover:bg-[var(--ink-3)] flex items-center gap-1.5"
                  style={{ color: "var(--paper-dim)" }}
                >
                  {link.href === "/ulubione" && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  )}
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex-1" />

          <InstallButton />
          <MobileDrawer categories={categories} shows={shows} people={people} />
        </nav>

        {/* MAIN */}
        <main>{children}</main>

        {/* FOOTER */}
        <footer
          className="px-6 lg:px-10 pt-16 pb-10"
          style={{ background: "var(--ink-2)", borderTop: "1px solid var(--line)" }}
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 max-w-6xl mx-auto">
            <div className="md:col-span-1">
              <div className="font-black text-3xl mb-3" style={{ letterSpacing: "-.03em" }}>
                parska<span className="dot-accent">.</span>
              </div>
              <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--paper-dim)" }}>
                {"Niezale\u017cny agregator polskiego stand-upu. R\u0119cznie moderowane zestawienia nowych nagra\u0144, specjali, wywiad\u00f3w i termin\u00f3w tras."}
              </p>
              <div className="mono text-xs uppercase" style={{ color: "var(--paper-mute)", letterSpacing: ".18em" }}>
                {"parska.pl \u00b7 od 2025"}
              </div>
            </div>

            <div>
              <h5 className="mono text-xs uppercase mb-4" style={{ color: "var(--paper-mute)", letterSpacing: ".18em" }}>
                {"Tre\u015bci"}
              </h5>
              <ul className="space-y-2">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm hover:text-white transition-colors" style={{ color: "var(--paper-dim)" }}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h5 className="mono text-xs uppercase mb-4" style={{ color: "var(--paper-mute)", letterSpacing: ".18em" }}>
                Standuperzy
              </h5>
              <ul className="space-y-2">
                {people.slice(0, 8).map((p) => (
                  <li key={p.slug}>
                    <Link href={"/standuper/" + p.slug} className="text-sm hover:text-white transition-colors" style={{ color: "var(--paper-dim)" }}>
                      {p.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h5 className="mono text-xs uppercase mb-4" style={{ color: "var(--paper-mute)", letterSpacing: ".18em" }}>
                Formaty
              </h5>
              <ul className="space-y-2">
                {shows.slice(0, 6).map((s) => (
                  <li key={s.slug}>
                    <Link href={"/format/" + s.slug} className="text-sm hover:text-white transition-colors" style={{ color: "var(--paper-dim)" }}>
                      {s.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div
            className="max-w-6xl mx-auto mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 mono text-xs uppercase"
            style={{ borderTop: "1px solid var(--line)", color: "var(--paper-mute)", letterSpacing: ".14em" }}
          >
            <span>{"\u00a9 2026 parska.pl \u00b7 r\u0119czna moderacja, codziennie"}</span>
            <span>{"Agregator tre\u015bci. Wszystkie prawa nale\u017c\u0105 do tw\u00f3rc\u00f3w."}</span>
          </div>
        </footer>
      </body>
    </html>
  );
}

