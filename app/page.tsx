import Link from "next/link";
import {
  getRecentItems,
  getFeaturedItems,
  getItemsByTagSlug,
  getLatestPerShow,
} from "@/lib/data";
import { HOME_FEATURED_LIMIT } from "@/lib/featured";
import { selectHomeFormats } from "@/lib/home-shows";
import ScrollRow from "./components/ScrollRow";
import HomeVideoGrid from "./components/HomeVideoGrid";
import FavoritesSection from "./components/FavoritesSection";
import FormatCard from "./components/FormatCard";

export const revalidate = 120;


function SectionHead({ title, sub, linkHref, linkText }: { title: string; sub?: string; linkHref?: string; linkText?: string }) {
  return (
    <div className="flex items-end justify-between mb-8 gap-6 flex-wrap">
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

function nowyLabel(n: number): string {
  if (n === 1) return "nowy";
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 > 20)) return "nowe";
  return "nowych";
}

function pozycjaLabel(n: number): string {
  if (n === 1) return "pozycja";
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 > 20)) return "pozycje";
  return "pozycji";
}

export default async function HomePage() {
  const [recentItems, featuredItems, specjalItems, showSections] = await Promise.all([
    getRecentItems(7, 3, 30),
    getFeaturedItems(HOME_FEATURED_LIMIT),
    getItemsByTagSlug("special", 10),
    getLatestPerShow(3),
  ]);
  const activeShows = selectHomeFormats(showSections);
  const noweHref = recentItems.length > 0 ? "#nowe" : "/standup";

  return (
    <>
      {/* HERO */}
      <header className="px-6 lg:px-10 pt-6 pb-6 md:pt-12 md:pb-10" style={{ borderBottom: "1px solid var(--line)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="mono text-xs uppercase mb-3 md:mb-5 flex items-center gap-3" style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}>
            <span>polski stand-up {"\u00b7"} jeden adres</span>
            {recentItems.length > 0 && (
              <span style={{ color: "var(--coral)" }}>
                {"\u25cf"} {recentItems.length} {nowyLabel(recentItems.length)}
              </span>
            )}
          </div>
          <h1 className="font-black m-0 mb-3 text-[34px] leading-[0.92] tracking-[-0.035em] sm:text-[42px] md:mb-5 md:text-[clamp(42px,6vw,88px)]">
            Ca{"ł"}y polski{" "}
            <span className="serif" style={{ color: "var(--coral)", whiteSpace: "nowrap" }}>stand-up</span>
            <br />w jednym miejscu<span style={{ color: "var(--coral)" }}>.</span>
          </h1>
          <p className="m-0 max-w-2xl text-[15.5px] leading-snug md:text-[19px] md:leading-relaxed" style={{ color: "var(--paper-dim)" }}>
            Nowe nagrania, specjale, wywiady i formaty {"\u2014"} w jednym miejscu.
            <span className="hidden md:inline">
              {" Codziennie przegl\u0105damy YouTube i strony komik\u00f3w, \u017ceby zebra\u0107 to, co naprawd\u0119 warto obejrze\u0107."}
            </span>
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3 md:mt-7">
            <Link
              href={noweHref}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--coral)] px-5 py-2.5 text-sm font-black text-[var(--ink)] transition-colors hover:bg-[var(--coral-hi)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--paper)]"
            >
              Zobacz nowe
              <span aria-hidden="true">{"\u2192"}</span>
            </Link>
            <Link
              href="/trasy"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-black transition-colors hover:bg-[var(--ink-3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]"
              style={{ color: "var(--paper)", border: "1px solid var(--line-2)" }}
            >
              Trasy i bilety
            </Link>
          </div>
        </div>
      </header>

      {/* NOWE */}
      {recentItems.length > 0 && (
        <section id="nowe" className="band scroll-mt-16">
          <div className="max-w-6xl mx-auto">
            <SectionHead title="Nowe" sub={"Ostatnie 7 dni \u00b7 " + recentItems.length + " " + pozycjaLabel(recentItems.length)} linkHref="/standup" linkText={"Zobacz wszystkie \u2192"} />
            <div className="md:hidden">
              <ScrollRow items={recentItems} />
            </div>
            <div className="hidden md:block">
              <HomeVideoGrid items={recentItems} />
            </div>
          </div>
        </section>
      )}

      {/* ULUBIONE */}
      <FavoritesSection />

      {/* POLECANE */}
      {featuredItems.length > 0 && (
        <section className="band" style={{ background: "linear-gradient(180deg, #14120E 0%, #0B0B0B 100%)" }}>
          <div className="max-w-6xl mx-auto">
            <SectionHead title="Polecane" sub={"R\u0119czna selekcja"} />
            <ScrollRow items={featuredItems} />
          </div>
        </section>
      )}

      {/* SPECJALE */}
      {specjalItems.length > 0 && (
        <section className="band">
          <div className="max-w-6xl mx-auto">
            <SectionHead title="Specjale" sub={"Pe\u0142nometra\u017cowe wydania"} linkHref="/specjale" linkText="Wszystkie specjale →" />
            <ScrollRow items={specjalItems} />
          </div>
        </section>
      )}

      {/* FORMATY */}
      {activeShows.length > 0 && (
        <section className="band">
          <div className="max-w-6xl mx-auto">
            <SectionHead
              title="Formaty"
              sub={"Aktywne \u00b7 " + activeShows.length}
              linkHref="/formaty"
              linkText={"Wszystkie formaty \u2192"}
            />
            <div className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-6 scrollbar-hide md:hidden">
              {activeShows.map(({ show, totalCount, latestDate, items }) => (
                <div key={show.id} className="w-72 sm:w-80 shrink-0 snap-start">
                  <FormatCard
                    name={show.name}
                    slug={show.slug}
                    thumbnailUrl={items[0]?.thumbnail_url ?? null}
                    durationSeconds={items[0]?.duration_seconds ?? null}
                    totalCount={totalCount}
                    latestDate={latestDate}
                  />
                </div>
              ))}
            </div>
            <div className="hidden md:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {activeShows.map(({ show, totalCount, latestDate, items }) => (
                <FormatCard
                  key={show.id}
                  name={show.name}
                  slug={show.slug}
                  thumbnailUrl={items[0]?.thumbnail_url ?? null}
                  durationSeconds={items[0]?.duration_seconds ?? null}
                  totalCount={totalCount}
                  latestDate={latestDate}
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

