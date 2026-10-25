"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import HeartButton from "./HeartButton";
import {
  DIRECTORY_LETTERS,
  groupPeopleByLetter,
  pozycjaCountLabel,
} from "@/lib/standuperzy-directory";

type DirectoryPerson = {
  id: number;
  name: string;
  slug: string;
  itemCount: number;
};

function sectionId(letter: string): string {
  return "litera-" + encodeURIComponent(letter);
}

function countLabel(count: number): string {
  if (count <= 0) return "\u2014";
  return count + " " + pozycjaCountLabel(count);
}

const LetterSections = memo(function LetterSections({
  groups,
  headerTop,
}: {
  groups: { letter: string; people: DirectoryPerson[] }[];
  headerTop: number;
}) {
  return (
    <div>
      {groups.map((group) => (
        <section
          key={group.letter}
          id={sectionId(group.letter)}
          data-directory-letter={group.letter}
          className="mb-8"
          style={{ scrollMarginTop: headerTop }}
        >
          <h2
            className="sticky z-20 m-0 py-2 font-black"
            style={{
              top: headerTop,
              background: "var(--ink)",
              fontSize: "22px",
              letterSpacing: "-.02em",
            }}
          >
            {group.letter}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {group.people.map((person) => (
              <div
                key={person.id}
                className="group flex items-center gap-2 rounded-2xl py-2 pl-4 pr-2 transition-all hover:bg-[var(--ink-3)]"
                style={{ border: "1px solid var(--line)" }}
              >
                <Link
                  href={"/standuper/" + person.slug}
                  className="flex min-w-0 flex-1 items-center gap-4 py-2"
                >
                  <div
                    className="w-12 h-12 rounded-full shrink-0 grid place-items-center font-black text-sm"
                    style={{
                      background: "linear-gradient(135deg, var(--coral), #F2A65A)",
                      color: "var(--ink)",
                    }}
                  >
                    {person.name.split(" ").map((w) => w.charAt(0)).join("").slice(0, 2)}
                  </div>

                  <div className="min-w-0">
                    <div className="font-bold text-sm group-hover:text-white transition-colors" style={{ color: "var(--paper)" }}>
                      {person.name}
                    </div>
                    <div className="mono text-xs" style={{ color: "var(--paper-mute)", fontSize: "11px" }}>
                      {countLabel(person.itemCount)}
                    </div>
                  </div>

                  <span className="ml-auto text-sm" style={{ color: "var(--paper-mute)" }}>
                    {"\u2192"}
                  </span>
                </Link>
                <HeartButton type="person" slug={person.slug} name={person.name} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
});

export default function StanduperzyList({ people }: { people: DirectoryPerson[] }) {
  const [search, setSearch] = useState("");
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [offsets, setOffsets] = useState({ nav: 72, bar: 52 });
  const barRef = useRef<HTMLElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return people;
    return people.filter((person) => person.name.toLowerCase().includes(q));
  }, [people, search]);

  const groups = useMemo(() => groupPeopleByLetter(filtered), [filtered]);
  const present = useMemo(() => new Set(groups.map((group) => group.letter)), [groups]);
  const jumpLetters = useMemo(() => {
    const known = new Set<string>(DIRECTORY_LETTERS);
    const extra = groups.map((group) => group.letter).filter((letter) => !known.has(letter));
    return [...DIRECTORY_LETTERS, ...extra];
  }, [groups]);

  useEffect(() => {
    const nav = document.querySelector("body > nav");
    const measure = () => {
      const navH = Math.round(nav?.getBoundingClientRect().height ?? 0);
      const barH = Math.round(barRef.current?.getBoundingClientRect().height ?? 0);
      setOffsets((prev) => (prev.nav === navH && prev.bar === barH ? prev : { nav: navH, bar: barH }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (nav) ro.observe(nav);
    if (barRef.current) ro.observe(barRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = offsets.nav + offsets.bar + 28;
      let current: string | null = null;
      document.querySelectorAll<HTMLElement>("[data-directory-letter]").forEach((node) => {
        if (node.getBoundingClientRect().top <= line) {
          current = node.getAttribute("data-directory-letter");
        }
      });
      if (current) setActiveLetter((prev) => (prev === current ? prev : current));
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [groups, offsets.nav, offsets.bar]);

  useEffect(() => {
    if (!activeLetter) return;
    const scroller = scrollerRef.current;
    const button = scroller?.querySelector<HTMLButtonElement>(`[data-jump="${CSS.escape(activeLetter)}"]`);
    if (!scroller || !button) return;
    const barBox = scroller.getBoundingClientRect();
    const buttonBox = button.getBoundingClientRect();
    if (buttonBox.left < barBox.left || buttonBox.right > barBox.right) {
      scroller.scrollLeft += buttonBox.left - barBox.left - (barBox.width - buttonBox.width) / 2;
    }
  }, [activeLetter]);

  const scrollToLetter = (letter: string) => {
    const el = document.getElementById(sectionId(letter));
    if (!el) return;
    const navH = document.querySelector("body > nav")?.getBoundingClientRect().height ?? offsets.nav;
    const barH = barRef.current?.getBoundingClientRect().height ?? offsets.bar;
    const top = Math.max(0, el.getBoundingClientRect().top + window.scrollY - navH - barH);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
    setActiveLetter(letter);
  };

  return (
    <div>
      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={"Szukaj standupera\u2026"}
          aria-label={"Szukaj standupera"}
          className="w-full max-w-md px-4 py-3 rounded-full mono text-sm outline-none"
          style={{
            background: "var(--ink-3)",
            border: "1px solid var(--line-2)",
            color: "var(--paper)",
            fontSize: "14px",
          }}
        />
      </div>

      <nav
        ref={barRef}
        aria-label={"Skocz do litery"}
        className="sticky z-30 mb-6"
        style={{
          top: offsets.nav,
          background: "var(--ink)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div ref={scrollerRef} className="flex gap-0.5 overflow-x-auto scrollbar-hide py-2">
          {jumpLetters.map((letter) => {
            const enabled = present.has(letter);
            const current = letter === activeLetter && enabled;
            return (
              <button
                key={letter}
                type="button"
                data-jump={letter}
                disabled={!enabled}
                aria-current={current ? "true" : undefined}
                aria-label={"Skocz do litery " + letter}
                onClick={() => scrollToLetter(letter)}
                className="mono shrink-0 inline-flex items-center justify-center h-9 min-w-8 px-1.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]"
                style={{
                  color: current ? "var(--ink)" : enabled ? "var(--paper)" : "var(--paper-mute)",
                  background: current ? "var(--paper)" : "transparent",
                  opacity: enabled ? 1 : 0.35,
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: enabled ? "pointer" : "default",
                }}
              >
                {letter}
              </button>
            );
          })}
        </div>
      </nav>

      {filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: "var(--paper-mute)" }}>
          <p>{"Nie znaleziono standuper\u00f3w pasuj\u0105cych do \u201e"}{search}{"\u201d"}</p>
        </div>
      ) : (
        <LetterSections groups={groups} headerTop={offsets.nav + offsets.bar} />
      )}
    </div>
  );
}
