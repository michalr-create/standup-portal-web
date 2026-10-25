"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Item } from "@/lib/data";
import ItemsBrowser from "./ItemsBrowser";
import { sortStandupTagChips } from "./standupTagChipOrder";
import { tagDisplayName } from "./tagDisplayName";

type CountWord = { one: string; many: string };

const CHIP_ROW_MOBILE = "(max-width: 767px)";

const filterStyles = `
.fib-controls {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
  min-width: 0;
  max-width: 100%;
}
.fib-person {
  max-width: 100%;
}
.fib-chip-scroller {
  position: relative;
  min-width: 0;
  max-width: 100%;
}
.fib-chip-row {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
.fib-chip-fade {
  display: none;
}
@media (max-width: 767px) {
  .fib-controls {
    flex-direction: column;
    align-items: stretch;
  }
  .fib-person {
    width: 100%;
  }
  .fib-chip-scroller {
    width: 100%;
  }
  .fib-chip-row {
    overflow-x: auto;
    flex-wrap: nowrap;
    -webkit-overflow-scrolling: touch;
  }
  .fib-chip-fade[data-on="true"] {
    display: block;
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 40px;
    pointer-events: none;
    background: linear-gradient(to right, rgba(11, 11, 11, 0), var(--ink) 78%);
  }
}
@media (min-width: 768px) {
  /* Chips stay in the same wrapping row as the person select. */
  .fib-chip-scroller,
  .fib-chip-row {
    display: contents;
  }
}
`;

function useChipRowFade(itemCount: number) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [showFade, setShowFade] = useState(false);

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;

    const update = () => {
      const mobile = window.matchMedia(CHIP_ROW_MOBILE).matches;
      const overflows = mobile && row.clientWidth > 0 && row.scrollWidth - row.clientWidth > 1;
      const atEnd = row.scrollLeft + row.clientWidth >= row.scrollWidth - 2;
      const next = overflows && !atEnd;
      setShowFade((prev) => (prev === next ? prev : next));
    };

    update();
    row.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const media = window.matchMedia(CHIP_ROW_MOBILE);
    media.addEventListener("change", update);
    const observer = new ResizeObserver(update);
    observer.observe(row);
    return () => {
      row.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      media.removeEventListener("change", update);
      observer.disconnect();
    };
  }, [itemCount]);

  return { rowRef, showFade };
}

function countLabel(
  shown: number,
  inView: number,
  word: CountWord,
  isFiltered: boolean,
  catalogTotal?: number,
): string {
  if (catalogTotal != null && !isFiltered) {
    const w = catalogTotal === 1 ? word.one : word.many;
    return `${catalogTotal} ${w}`;
  }
  const w = shown === 1 ? word.one : word.many;
  if (isFiltered) {
    return catalogTotal != null
      ? `${shown} z ${inView} ${w} na tej stronie`
      : `${shown} z ${inView} ${w}`;
  }
  return `${shown} ${w}`;
}

export default function FilterableItemsBrowser({
  items,
  countWord = { one: "pozycja", many: "pozycji" },
  catalogTotal,
  tagChipOrder = "alphabetical",
}: {
  items: Item[];
  countWord?: CountWord;
  catalogTotal?: number;
  /** Standup category chips pin Special, Stand-up impro, then klipy. */
  tagChipOrder?: "alphabetical" | "standup";
}) {
  const [search, setSearch] = useState("");
  const [personSlug, setPersonSlug] = useState("");
  const [tagSlug, setTagSlug] = useState("");

  const people = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      for (const p of item.people) {
        if (!map.has(p.slug)) map.set(p.slug, p.name);
      }
    }
    return [...map.entries()]
      .map(([slug, name]) => ({ slug, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "pl"));
  }, [items]);

  const availableTags = useMemo(() => {
    const map = new Map<string, { name: string; slug: string; tag_type: string }>();
    for (const item of items) {
      for (const t of item.tags) {
        if (!map.has(t.slug)) map.set(t.slug, t);
      }
    }
    const tags = [...map.values()];
    if (tagChipOrder === "standup") return sortStandupTagChips(tags);
    return tags.sort((a, b) => a.name.localeCompare(b.name, "pl"));
  }, [items, tagChipOrder]);

  const { rowRef, showFade } = useChipRowFade(availableTags.length);

  const filtered = useMemo(() => {
    let result = items;
    const q = search.trim().toLowerCase();
    if (q) result = result.filter((i) => i.title.toLowerCase().includes(q));
    if (personSlug) result = result.filter((i) => i.people.some((p) => p.slug === personSlug));
    if (tagSlug) result = result.filter((i) => i.tags.some((t) => t.slug === tagSlug));
    return result;
  }, [items, search, personSlug, tagSlug]);

  const isFiltered = !!search.trim() || !!personSlug || !!tagSlug;

  const inputBase: React.CSSProperties = {
    background: "rgba(255,255,255,.06)",
    border: "1px solid var(--line)",
    color: "var(--paper)",
    borderRadius: "10px",
    padding: "10px 14px",
    fontSize: "15px",
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
  };

  return (
    <div>
      <style>{filterStyles}</style>
      <div className="mb-6" style={{ display: "flex", flexDirection: "column", gap: "12px", minWidth: 0, maxWidth: "100%" }}>
        <input
          type="search"
          placeholder={"Szukaj po tytule\u2026"}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputBase, width: "100%" }}
        />

        {(people.length > 0 || availableTags.length > 0) && (
          <div className="fib-controls">
            {people.length > 0 && (
              <select
                className="fib-person"
                value={personSlug}
                onChange={(e) => setPersonSlug(e.target.value)}
                style={{
                  ...inputBase,
                  cursor: "pointer",
                  appearance: "none",
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23EFE8DC' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E\")",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 12px center",
                  paddingRight: "36px",
                }}
              >
                <option value="">Wszyscy standuperzy</option>
                {people.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}

            {availableTags.length > 0 && (
              <div className="fib-chip-scroller">
                <div ref={rowRef} className="fib-chip-row scrollbar-hide">
                  {availableTags.map((tag) => {
                    const active = tagSlug === tag.slug;
                    return (
                      <button
                        key={tag.slug}
                        type="button"
                        onClick={() => setTagSlug(active ? "" : tag.slug)}
                        style={{
                          background: active ? "var(--coral)" : "rgba(255,255,255,.06)",
                          border: `1px solid ${active ? "var(--coral)" : "var(--line)"}`,
                          color: active ? "#fff" : "var(--paper-dim)",
                          borderRadius: "20px",
                          padding: "7px 14px",
                          fontSize: "13px",
                          fontWeight: active ? 700 : 400,
                          cursor: "pointer",
                          transition: "background 0.15s, border-color 0.15s, color 0.15s",
                          fontFamily: "inherit",
                          lineHeight: 1,
                          flexShrink: 0,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {tagDisplayName(tag.name)}
                      </button>
                    );
                  })}
                </div>
                <div
                  className="fib-chip-fade"
                  data-on={showFade ? "true" : "false"}
                  aria-hidden="true"
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 mb-5">
        <span
          className="mono text-xs uppercase"
          style={{ color: "var(--paper-mute)", letterSpacing: ".16em", minWidth: 0, flex: "1 1 auto" }}
        >
          {countLabel(filtered.length, items.length, countWord, isFiltered, catalogTotal)}
        </span>
        {isFiltered && (
          <button
            type="button"
            onClick={() => { setSearch(""); setPersonSlug(""); setTagSlug(""); }}
            style={{
              color: "var(--coral)",
              fontSize: "13px",
              cursor: "pointer",
              background: "none",
              border: "none",
              fontFamily: "inherit",
              minHeight: "44px",
              minWidth: "44px",
              padding: "10px 8px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            {"Wyczy\u015b\u0107 filtry \u00d7"}
          </button>
        )}
      </div>

      <ItemsBrowser items={filtered} />
    </div>
  );
}
