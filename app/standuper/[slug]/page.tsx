import { getPersonBySlug, getItemsByPersonSlug } from "@/lib/data";
import type { Item } from "@/lib/data";
import ItemsBrowser from "@/app/components/ItemsBrowser";
import HeartButton from "@/app/components/HeartButton";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

const SECTIONS: { key: string; label: string }[] = [
  { key: "special", label: "Specials" },
  { key: "standup", label: "Standup" },
  { key: "formaty", label: "Formaty" },
  { key: "wywiady", label: "Wywiady" },
  { key: "kulisy", label: "Kulisy" },
  { key: "shorts", label: "Shorts" },
];

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

export default async function StanduperPage({ params }: Props) {
  const { slug } = await params;
  const [person, items] = await Promise.all([
    getPersonBySlug(slug),
    getItemsByPersonSlug(slug, 999),
  ]);

  if (!person) notFound();

  const grouped = groupItems(items);

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

        {SECTIONS.map(({ key, label }) => {
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
