"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import {
  searchChipMode,
  searchHref,
  wynikLabel,
  type SearchFacet,
} from "@/lib/search-filters";

const chipClass =
  "chip inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]";

function revealCurrentChip(nav: HTMLElement) {
  const current = nav.querySelector<HTMLElement>('[aria-current="page"]');
  if (!current) return;
  const navBox = nav.getBoundingClientRect();
  const chipBox = current.getBoundingClientRect();
  if (chipBox.left >= navBox.left - 1 && chipBox.right <= navBox.right + 1) return;
  const delta = chipBox.left - navBox.left - (navBox.width - chipBox.width) / 2;
  nav.scrollLeft += delta;
}

export default function SearchCategoryChips({
  query,
  active,
  wszystkoCount,
  facets,
}: {
  query: string;
  active: string;
  wszystkoCount: number;
  facets: SearchFacet[];
}) {
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = navRef.current;
    if (nav) revealCurrentChip(nav);
  }, [active, query]);

  const chips = [{ slug: "", name: "Wszystko", count: wszystkoCount }, ...facets];
  return (
    <nav
      ref={navRef}
      aria-label="Kategorie wyników"
      className="mb-8 flex max-w-full items-center gap-2 overflow-x-auto pb-1 scrollbar-hide lg:flex-wrap lg:overflow-visible"
    >
      {chips.map((chip) => {
        const current = chip.slug === active;
        const mode = searchChipMode(chip.count, current);
        const label = `${chip.name}, ${chip.count} ${wynikLabel(chip.count)}`;
        const className = `${chipClass}${mode === "current" ? " active" : ""}${mode === "muted" ? " pointer-events-none opacity-40" : ""}`;
        const body = (
          <>
            <span>{chip.name}</span>
            <span className="mono" style={{ opacity: 0.72 }}>{chip.count}</span>
          </>
        );
        if (mode === "muted") {
          return (
            <span key={chip.slug || "all"} className={className} aria-disabled="true" aria-label={label}>
              {body}
            </span>
          );
        }
        return (
          <Link
            key={chip.slug || "all"}
            href={searchHref({ q: query, kategoria: chip.slug })}
            className={className}
            aria-current={current ? "page" : undefined}
            aria-label={label}
          >
            {body}
          </Link>
        );
      })}
    </nav>
  );
}
