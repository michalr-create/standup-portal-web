import Link from "next/link";
import {
  getRecentItems,
  getFeaturedItems,
  getItemsByTagSlug,
  getLatestPerShow,
} from "@/lib/data";
import type { Show } from "@/lib/data";
import ScrollRow from "./components/ScrollRow";
import HomeVideoGrid from "./components/HomeVideoGrid";
import FavoritesSection from "./components/FavoritesSection";

export const dynamic = "force-dynamic";
export const revalidate = 0;


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

function odcinekLabel(n: number): string {
  if (n === 1) return "odcinek";
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 > 20)) return "odcinki";
  return "odcink\u00f3w";
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

function ShowBlock({ show, totalCount, latestDate }: { show: Show; totalCount: number; latestDate: string | null }) {
  const latestLabel = latestDate
    ? new Date(latestDate).toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <Link href={"/format/" + show.slug} className="fcard group">
      <div className="w-12 h-12 rounded-xl grid place-items-center font-black mono text-lg" style={{ background: "var(--ink)", color: "var(--paper)" }}>
        {show.name.charAt(0)}
      </div>
      <h4 className="font-black m-0 leading-tight" style={{ fontSize: "20px", letterSpacing: "-.01em", color: "var(--ink)" }}>
        {show.name}
      </h4>
      {show.description && (
        <p className="m-0 leading-relaxed line-clamp-2" style={{ fontSize: "13.5px", color: "#4a453c" }}>
          {show.description}
        </p>
      )}
      <div className="mt-auto mono text-xs uppercase flex justify-between items-center" style={{ color: "#7a7466", letterSpacing: ".14em" }}>
        <span>{totalCount} {odcinekLabel(totalCount)}</span>
        <span className="w-7 h-7 rounded-full grid place-items-center text-sm" style={{ background: "var(--ink)", color: "var(--paper)" }}>
          {"\u2192"}
        </span>
      </div>
      {latestLabel && (
        <div className="mono text-xs" style={{ color: "#9a9080", letterSpacing: ".08em", marginTop: "-6px" }}>
          ostatni: {latestLabel}
        </div>
      )}
    </Link>
  );
}

export default async function HomePage() {
  const [recentItems, featuredItems, specjalItems, showSections] = await Promise.all([
    getRecentItems(7, 3, 30),
    getFeaturedItems(8),
    getItemsByTagSlug("special", 10),
    getLatestPerShow(3),
  ]);

  return (
    <>
      {/* HERO */}
      <header className="px-6 lg:px-10 pt-12 pb-10" style={{ borderBottom: "1px solid var(--line)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="mono text-xs uppercase mb-5 flex items-center gap-3" style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}>
            <span>polski stand-up {"\u00b7"} jeden adres</span>
            {recentItems.length > 0 && (
              <span style={{ color: "var(--coral)" }}>
                {"\u25cf"} {recentItems.length} {nowyLabel(recentItems.length)}
              </span>
            )}
          </div>
          <h1 className="font-black m-0 mb-5" style={{ fontSize: "clamp(42px, 6vw, 88px)", lineHeight: ".92", letterSpacing: "-.035em" }}>
            Ca{"ł"}y polski{" "}
            <span className="serif" style={{ color: "var(--coral)", whiteSpace: "nowrap" }}>stand-up</span>
            <br />w jednym miejscu<span style={{ color: "var(--coral)" }}>.</span>
          </h1>
          <p className="text-lg leading-relaxed max-w-2xl m-0" style={{ color: "var(--paper-dim)", fontSize: "19px", lineHeight: "1.55" }}>
            Codziennie przegl{"ą"}damy YouTube, strony komik{"ó"}w i informacje z klub{"ó"}w, {"ż"}eby zebra{"ć"} to, co naprawd{"ę"} warto obejrze{"ć"}. Nowe specjale, wywiady, formaty i terminy tras {"—"} bez scrollowania po dziesi{"ę"}ciu zak{"ł"}adkach.
          </p>
        </div>
      </header>

      {/* NOWE */}
      {recentItems.length > 0 && (
        <section className="band">
          <div className="max-w-6xl mx-auto">
            <SectionHead title="Nowe" sub={"Ostatnie 7 dni \u00b7 " + recentItems.length + " " + pozycjaLabel(recentItems.length)} linkHref="/standup" linkText={"Zobacz wszystkie \u2192"} />
            <HomeVideoGrid items={recentItems} />
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
            <SectionHead title="Specials" sub={"Pe\u0142nometra\u017cowe wydania"} linkHref="/specjale" linkText={"Wszystkie specials \u2192"} />
            <ScrollRow items={specjalItems} />
          </div>
        </section>
      )}

      {/* FORMATY */}
      {showSections.length > 0 && (
        <section className="band band-light">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-end justify-between mb-8 gap-6 flex-wrap">
              <div className="flex items-baseline gap-4 flex-wrap">
                <h2 className="font-black m-0 leading-none" style={{ fontSize: "clamp(32px, 4vw, 44px)", letterSpacing: "-.025em", color: "var(--ink)" }}>
                  Formaty<span className="dot-accent">.</span>
                </h2>
                <span className="mono text-xs uppercase" style={{ color: "#555", letterSpacing: ".16em" }}>
                  Cykliczne programy
                </span>
              </div>
              <Link href="/formaty" className="mono text-xs uppercase pb-0.5 transition-colors hover:text-black" style={{ color: "#333", letterSpacing: ".14em", borderBottom: "1px solid rgba(11,11,11,.15)" }}>
                {"Wszystkie formaty \u2192"}
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {showSections.map(({ show, totalCount, latestDate }) => (
                <ShowBlock key={show.id} show={show} totalCount={totalCount} latestDate={latestDate} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

