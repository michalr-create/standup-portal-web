import Link from "next/link";
import { getPersonBySlug, getItemsByPersonSlug, getDefaultShowsForPerson } from "@/lib/data";
import type { Item, Show } from "@/lib/data";
import ItemsBrowser from "@/app/components/ItemsBrowser";
import HeartButton from "@/app/components/HeartButton";
import { notFound } from "next/navigation";

export const revalidate = 120;

type Props = {
  params: Promise<{ slug: string }>;
};


function groupItems(items: Item[]): Map<string, Item[]> {
  const map = new Map<string, Item[]>();
  for (const item of items) {
    const isSpecial = item.tags.some((t) => t.slug === "special");
    const key = isSpecial ? "special" : (item.categorySlug ?? "inne");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}

function materialLabel(n: number): string {
  if (n === 1) return "materia\u0142";
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 > 20)) return "materia\u0142y";
  return "materia\u0142\u00f3w";
}

function odcinekLabel(n: number): string {
  if (n === 1) return "odcinek";
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 > 20)) return "odcinki";
  return "odcink\u00f3w";
}

function ShowCard({ show, totalCount, latestDate, latestThumbnail }: {
  show: Show;
  totalCount: number;
  latestDate: string | null;
  latestThumbnail: string | null;
}) {
  const latestLabel = latestDate
    ? new Date(latestDate).toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <Link href={"/format/" + show.slug} className="group block text-left">
      <div
        className="overflow-hidden relative"
        style={{
          aspectRatio: "16/10",
          borderRadius: "14px",
          border: "1px solid var(--line)",
          background: "var(--ink-3)",
        }}
      >
        {latestThumbnail && (
          <img
            src={latestThumbnail}
            alt={show.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            style={{ opacity: 0.45 }}
          />
        )}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top, rgba(11,11,11,.95) 35%, rgba(11,11,11,.15) 100%)" }}
        />
        <div
          className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-1 rounded-md"
          style={{ background: "rgba(11,11,11,.75)", backdropFilter: "blur(6px)", color: "var(--paper)", fontSize: "11px", fontWeight: 700 }}
        >
          <span className="inline-block w-2 h-2 rounded-sm" style={{ background: "var(--coral)" }} />
          Format
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div
            className="font-extrabold leading-tight mb-1"
            style={{ fontSize: "16px", letterSpacing: "-.01em", color: "var(--paper)" }}
          >
            {show.name}
          </div>
          {show.description && (
            <div className="line-clamp-1 mb-2" style={{ fontSize: "13px", color: "var(--paper-dim)" }}>
              {show.description}
            </div>
          )}
          <div className="mono flex gap-3" style={{ fontSize: "11px", color: "var(--paper-mute)" }}>
            <span>{totalCount} {odcinekLabel(totalCount)}</span>
            {latestLabel && <span>ostatni: {latestLabel}</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default async function StanduperPage({ params }: Props) {
  const { slug } = await params;
  const person = await getPersonBySlug(slug);
  if (!person) notFound();

  const [items, defaultShows] = await Promise.all([
    getItemsByPersonSlug(slug, 999),
    getDefaultShowsForPerson(person.id),
  ]);

  const defaultShowIds = new Set(defaultShows.map((d) => d.show.id));
  const otherItems = items.filter((i) => !i.show_id || !defaultShowIds.has(i.show_id));
  const grouped = groupItems(otherItems);

  const hasFormatyItems = defaultShows.length > 0 || (grouped.get("formaty") ?? []).length > 0;

  return (
    <div className="band">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <div className="mono text-xs uppercase mb-3" style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}>
            {person.role || "Standuper"}
          </div>
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <h1 className="font-black m-0 leading-none" style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-.025em" }}>
              {person.name}<span className="dot-accent">.</span>
            </h1>
            <HeartButton type="person" slug={slug} />
            <span className="mono text-xs uppercase" style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}>
              {items.length} {materialLabel(items.length)}
            </span>
          </div>
          {person.bio && (
            <p className="max-w-2xl" style={{ color: "var(--paper-dim)", fontSize: "17px", lineHeight: "1.55" }}>
              {person.bio}
            </p>
          )}
        </header>

        {items.length === 0 && (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">{"🎤"}</div>
            <p style={{ color: "var(--paper-mute)" }}>Brak materia{"ł"}{"ó"}w.</p>
          </div>
        )}

        {/* Specials, Standup */}
        {[{ key: "special", label: "Specials" }, { key: "standup", label: "Standup" }].map(({ key, label }) => {
          const sectionItems = grouped.get(key);
          if (!sectionItems || sectionItems.length === 0) return null;
          return (
            <section key={key} className="mb-14">
              <div className="flex items-baseline gap-3 mb-6">
                <h2 className="font-black m-0 leading-none" style={{ fontSize: "clamp(22px, 3vw, 30px)", letterSpacing: "-.02em" }}>
                  {label}<span className="dot-accent">.</span>
                </h2>
                <span className="mono text-xs uppercase" style={{ color: "var(--paper-mute)", letterSpacing: ".14em" }}>
                  {sectionItems.length} {materialLabel(sectionItems.length)}
                </span>
              </div>
              <ItemsBrowser items={sectionItems} />
            </section>
          );
        })}

        {/* Formaty — karty formatów + ewentualne luźne odcinki */}
        {hasFormatyItems && (
          <section className="mb-14">
            <div className="flex items-baseline gap-3 mb-6">
              <h2 className="font-black m-0 leading-none" style={{ fontSize: "clamp(22px, 3vw, 30px)", letterSpacing: "-.02em" }}>
                Formaty<span className="dot-accent">.</span>
              </h2>
            </div>
            {defaultShows.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
                {defaultShows.map(({ show, totalCount, latestDate, latestThumbnail }) => (
                  <ShowCard key={show.id} show={show} totalCount={totalCount} latestDate={latestDate} latestThumbnail={latestThumbnail} />
                ))}
              </div>
            )}
            {(grouped.get("formaty") ?? []).length > 0 && (
              <ItemsBrowser items={grouped.get("formaty")!} />
            )}
          </section>
        )}

        {/* Wywiady, Kulisy, Shorts */}
        {[{ key: "wywiady", label: "Wywiady" }, { key: "kulisy", label: "Kulisy" }, { key: "shorts", label: "Shorts" }].map(({ key, label }) => {
          const sectionItems = grouped.get(key);
          if (!sectionItems || sectionItems.length === 0) return null;
          return (
            <section key={key} className="mb-14">
              <div className="flex items-baseline gap-3 mb-6">
                <h2 className="font-black m-0 leading-none" style={{ fontSize: "clamp(22px, 3vw, 30px)", letterSpacing: "-.02em" }}>
                  {label}<span className="dot-accent">.</span>
                </h2>
                <span className="mono text-xs uppercase" style={{ color: "var(--paper-mute)", letterSpacing: ".14em" }}>
                  {sectionItems.length} {materialLabel(sectionItems.length)}
                </span>
              </div>
              <ItemsBrowser items={sectionItems} />
            </section>
          );
        })}
      </div>
    </div>
  );
}
