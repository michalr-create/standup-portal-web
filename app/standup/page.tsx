import Link from "next/link";
import {
  getRecentItems,
  getFeaturedItems,
  getItemsByTagSlug,
  getLatestPerShow,
} from "@/lib/data";
import type { Item, Show } from "@/lib/data";
import ScrollRow from "./components/ScrollRow";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "";
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return h + ":" + m + ":" + s;
  }
  return Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "";
  try {
    return new Date(dateString).toLocaleDateString("pl-PL", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return "";
  }
}

function timeAgo(dateString: string | null): string {
  if (!dateString) return "";
  const diff = Date.now() - new Date(dateString).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "przed chwil\u0105";
  if (hours < 24) return hours + " godz temu";
  const days = Math.floor(hours / 24);
  if (days === 1) return "wczoraj";
  if (days < 7) return days + " dni temu";
  return formatDate(dateString);
}

function VideoCard({ item }: { item: Item }) {
  const label = item.people.length > 0
    ? item.people.map((p) => p.name).join(" \u00b7 ")
    : item.showName || "";

  return (
    <Link
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block vcard"
    >
      <div
        className="overflow-hidden relative"
        style={{
          aspectRatio: "16/10",
          borderRadius: "14px",
          border: "1px solid var(--line)",
          background: "var(--ink-3)",
        }}
      >
        {item.thumbnail_url && (
          <img
            src={item.thumbnail_url}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        )}
        {item.duration_seconds != null && (
          <div
            className="absolute bottom-2.5 right-2.5 mono text-xs px-2 py-1 rounded-md"
            style={{ background: "rgba(11,11,11,.8)", color: "var(--paper)", fontSize: "11px" }}
          >
            {formatDuration(item.duration_seconds)}
          </div>
        )}
        <div
          className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold"
          style={{
            background: "rgba(11,11,11,.75)",
            backdropFilter: "blur(6px)",
            color: "var(--paper)",
            fontSize: "11px",
          }}
        >
          <span className="inline-block w-2 h-2 rounded-sm" style={{ background: "var(--coral)" }} />
          {item.categoryName || "YouTube"}
        </div>
        <div className="play-overlay">
          <div className="play-btn" />
        </div>
      </div>
      <div className="pt-3 px-0.5">
        <h4 className="font-extrabold leading-tight mb-1.5 line-clamp-2" style={{ fontSize: "16px", letterSpacing: "-.01em" }}>
          {item.title}
        </h4>
        <div className="flex items-center gap-2" style={{ color: "var(--paper-dim)", fontSize: "13px" }}>
          <span>{label}</span>
          {label && <span style={{ color: "var(--paper-mute)" }}>{"\u00b7"}</span>}
          <span className="mono" style={{ color: "var(--paper-mute)", fontSize: "11px" }}>
            {timeAgo(item.published_at)}
          </span>
        </div>
      </div>
    </Link>
  );
}

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

function ShowBlock({ show, items }: { show: Show; items: Item[] }) {
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
        <span>{items.length} odcinek{"o\u0301"}w</span>
        <span className="w-7 h-7 rounded-full grid place-items-center text-sm" style={{ background: "var(--ink)", color: "var(--paper)" }}>
          {"\u2192"}
        </span>
      </div>
    </Link>
  );
}

export default async function HomePage() {
  const [recentItems, featuredItems, specjalItems, showSections] = await Promise.all([
    getRecentItems(7, 3, 30),
    getFeaturedItems(8),
    getItemsByTagSlug("specjal", 10),
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
                {"\u25cf"} {recentItems.length} nowych
              </span>
            )}
          </div>
          <h1 className="font-black m-0 mb-5" style={{ fontSize: "clamp(42px, 6vw, 88px)", lineHeight: ".92", letterSpacing: "-.035em" }}>
            Ca{"ł"}y polski{" "}
            <span className="serif" style={{ color: "var(--coral)" }}>stand-up</span>
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
            <SectionHead title="Nowe" sub={"Ostatnie 7 dni \u00b7 " + recentItems.length + " pozycji"} linkHref="/standup" linkText={"Zobacz wszystkie \u2192"} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {recentItems.map((item) => (
                <VideoCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        </section>
      )}

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
            <SectionHead title="Specjale" sub={"Pe\u0142nometra\u017cowe wydania"} linkHref="/standup" linkText={"Wszystkie specjale \u2192"} />
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
              {showSections.map(({ show, items }) => (
                <ShowBlock key={show.id} show={show} items={items} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
