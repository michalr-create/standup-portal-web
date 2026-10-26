import type { ReactNode } from "react";
import Link from "next/link";
import { searchAll } from "@/lib/data";
import HighlightedText from "@/app/components/HighlightedText";
import ItemsBrowser from "@/app/components/ItemsBrowser";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

const RECOVERY = [
  { href: "/standuperzy", label: "Standuperzy" },
  { href: "/formaty", label: "Formaty" },
  { href: "/standup", label: "Standup" },
] as const;

function wynikLabel(n: number): string {
  if (n === 1) return "wynik";
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "wyniki";
  return "wyników";
}

function SearchField({ query }: { query: string }) {
  return (
    <form
      key={query}
      action="/szukaj"
      method="get"
      role="search"
      className="flex w-full items-stretch gap-2"
    >
      <label htmlFor="szukaj-q" className="sr-only">
        Szukaj standuperów, filmów i formatów
      </label>
      <div className="relative min-w-0 flex-1">
        <input
          id="szukaj-q"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Standuper, film, format…"
          enterKeyHint="search"
          autoComplete="off"
          className={`min-h-14 w-full appearance-none rounded-2xl text-[17px] outline-none placeholder:text-[var(--paper-mute)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)] ${query ? "pl-4 pr-14" : "px-4"}`}
          style={{
            background: "var(--ink-3)",
            border: "1px solid var(--line-2)",
            color: "var(--paper)",
          }}
        />
        {query ? (
          <Link
            href="/szukaj"
            aria-label="Wyczyść wyszukiwanie"
            className="absolute right-1.5 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-2xl leading-none text-[var(--paper-dim)] hover:bg-[var(--ink-4)] hover:text-[var(--paper)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]"
          >
            <span aria-hidden="true">×</span>
          </Link>
        ) : null}
      </div>
      <button
        type="submit"
        className="inline-flex min-h-14 min-w-11 shrink-0 items-center justify-center rounded-2xl px-5 text-base font-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--paper)]"
        style={{ background: "var(--coral)", color: "var(--ink)" }}
      >
        Szukaj
      </button>
    </form>
  );
}

function RecoveryLinks() {
  return (
    <div className="mt-8">
      <p
        className="mono mb-3 text-xs uppercase"
        style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}
      >
        Przejdź do
      </p>
      <nav aria-label="Inne działy" className="flex flex-wrap justify-center gap-3">
        {RECOVERY.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="chip inline-flex min-h-11 items-center justify-center px-4"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function Prompt({
  eyebrow,
  title,
  lead,
  query,
}: {
  eyebrow: string;
  title: string;
  lead: ReactNode;
  query: string;
}) {
  return (
    <div className="band">
      <div className="mx-auto max-w-xl py-6 text-center sm:py-12">
        <div
          className="mono mb-3 text-xs uppercase"
          style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}
        >
          {eyebrow}
        </div>
        <h1
          className="m-0 font-black leading-none"
          style={{ fontSize: "clamp(32px, 6vw, 48px)", letterSpacing: "-.025em" }}
        >
          {title}
          <span className="dot-accent">.</span>
        </h1>
        <p className="mx-auto mb-8 mt-4 max-w-md break-words text-base" style={{ color: "var(--paper-dim)" }}>
          {lead}
        </p>
        <SearchField query={query} />
        <RecoveryLinks />
      </div>
    </div>
  );
}

export default async function SzukajPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = q?.trim() || "";

  if (!query) {
    return (
      <Prompt
        eyebrow="Szukaj"
        title="Czego szukasz"
        lead="Wpisz frazę, żeby wyszukać."
        query=""
      />
    );
  }

  const { people, items, shows } = await searchAll(query);
  const totalCount = people.length + items.length + shows.length;

  if (totalCount === 0) {
    return (
      <Prompt
        eyebrow="Wyniki wyszukiwania"
        title="Brak wyników"
        lead={<>Nic nie pasuje do „{query}”. Spróbuj innej frazy.</>}
        query={query}
      />
    );
  }

  return (
    <div className="band">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <div className="mono text-xs uppercase mb-3" style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}>
            Wyniki wyszukiwania
          </div>
          <h1 className="font-black m-0 leading-none" style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-.025em" }}>
            „{query}”<span className="dot-accent">.</span>
          </h1>
          <p className="mt-3 mb-6" style={{ color: "var(--paper-dim)", fontSize: "15px" }}>
            {totalCount} {wynikLabel(totalCount)}
          </p>
          <div className="max-w-2xl">
            <SearchField query={query} />
          </div>
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
                      <HighlightedText text={p.name} query={query} />
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
                      <HighlightedText text={s.name} query={query} />
                    </div>
                    {s.description && (
                      <div className="text-xs mt-0.5 line-clamp-1" style={{ color: "var(--paper-mute)" }}>
                        {s.description}
                      </div>
                    )}
                  </div>
                  <span style={{ color: "var(--paper-mute)" }}>→</span>
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
            <ItemsBrowser items={items} highlight={query} />
          </section>
        )}
      </div>
    </div>
  );
}
