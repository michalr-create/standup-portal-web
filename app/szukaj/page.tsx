import Link from "next/link";
import { searchAll } from "@/lib/data";
import ItemsBrowser from "@/app/components/ItemsBrowser";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SzukajPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = q?.trim() || "";

  if (!query) {
    return (
      <div className="band">
        <div className="max-w-6xl mx-auto text-center py-20">
          <p style={{ color: "var(--paper-mute)" }}>Wpisz fraz\u0119, \u017ceby wyszuka\u0107.</p>
        </div>
      </div>
    );
  }

  const { people, items, shows } = await searchAll(query);
  const totalCount = people.length + items.length + shows.length;

  return (
    <div className="band">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <div className="mono text-xs uppercase mb-3" style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}>
            Wyniki wyszukiwania
          </div>
          <h1 className="font-black m-0 leading-none" style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-.025em" }}>
            {`\u201e${query}\u201d`}<span className="dot-accent">.</span>
          </h1>
          <p className="mt-3" style={{ color: "var(--paper-dim)", fontSize: "15px" }}>
            {totalCount === 0
              ? "Brak wynik\u00f3w."
              : `${totalCount} ${totalCount === 1 ? "wynik" : totalCount < 5 ? "wyniki" : "wynik\u00f3w"}`}
          </p>
        </header>

        {people.length > 0 && (
          <section className="mb-14">
            <div className="flex items-baseline gap-3 mb-6">
              <h2 className="font-black m-0 leading-none" style={{ fontSize: "clamp(22px, 3vw, 30px)", letterSpacing: "-.02em" }}>
                Standuperzy<span className="dot-accent">.</span>
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {people.map((p) => (
                <Link
                  key={p.slug}
                  href={`/standuper/${p.slug}`}
                  className="group flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-[var(--ink-3)]"
                  style={{ border: "1px solid var(--line)" }}
                >
                  <div
                    className="w-10 h-10 rounded-full grid place-items-center font-black text-base shrink-0"
                    style={{ background: "var(--coral)", color: "var(--ink)" }}
                  >
                    {p.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm leading-tight truncate" style={{ color: "var(--paper)" }}>
                      {p.name}
                    </div>
                    {p.role && (
                      <div className="mono text-xs mt-0.5 truncate" style={{ color: "var(--paper-mute)" }}>
                        {p.role}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {shows.length > 0 && (
          <section className="mb-14">
            <div className="flex items-baseline gap-3 mb-6">
              <h2 className="font-black m-0 leading-none" style={{ fontSize: "clamp(22px, 3vw, 30px)", letterSpacing: "-.02em" }}>
                Formaty<span className="dot-accent">.</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {shows.map((s) => (
                <Link
                  key={s.slug}
                  href={`/format/${s.slug}`}
                  className="group flex items-center gap-4 p-4 rounded-xl transition-colors hover:bg-[var(--ink-3)]"
                  style={{ border: "1px solid var(--line)" }}
                >
                  <div
                    className="w-10 h-10 rounded-lg grid place-items-center font-black text-base shrink-0"
                    style={{ background: "var(--coral)", color: "var(--ink)" }}
                  >
                    {s.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm leading-tight truncate" style={{ color: "var(--paper)" }}>
                      {s.name}
                    </div>
                    {s.description && (
                      <div className="text-xs mt-0.5 line-clamp-1" style={{ color: "var(--paper-mute)" }}>
                        {s.description}
                      </div>
                    )}
                  </div>
                  <span style={{ color: "var(--paper-mute)" }}>{"\u2192"}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {items.length > 0 && (
          <section className="mb-14">
            <div className="flex items-baseline gap-3 mb-6">
              <h2 className="font-black m-0 leading-none" style={{ fontSize: "clamp(22px, 3vw, 30px)", letterSpacing: "-.02em" }}>
                Filmy i odcinki<span className="dot-accent">.</span>
              </h2>
            </div>
            <ItemsBrowser items={items} />
          </section>
        )}
      </div>
    </div>
  );
}
