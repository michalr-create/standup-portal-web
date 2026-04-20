"use client";

import { useState, useMemo } from "react";
import type { Item } from "@/lib/data";
import ItemsBrowser from "./ItemsBrowser";

type CountWord = { one: string; many: string };

function countLabel(n: number, total: number, word: CountWord, isFiltered: boolean): string {
  const w = n === 1 ? word.one : word.many;
  return isFiltered ? `${n} z ${total} ${w}` : `${n} ${w}`;
}

export default function FilterableItemsBrowser({
  items,
  countWord = { one: "pozycja", many: "pozycji" },
}: {
  items: Item[];
  countWord?: CountWord;
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
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "pl"));
  }, [items]);

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
      <div className="mb-6" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <input
          type="search"
          placeholder={"Szukaj po tytule\u2026"}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputBase, width: "100%" }}
        />

        {(people.length > 0 || availableTags.length > 0) && (
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            {people.length > 0 && (
              <select
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

            {availableTags.map((tag) => {
              const active = tagSlug === tag.slug;
              return (
                <button
                  key={tag.slug}
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
                  }}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-5">
        <span
          className="mono text-xs uppercase"
          style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}
        >
          {countLabel(filtered.length, items.length, countWord, isFiltered)}
        </span>
        {isFiltered && (
          <button
            onClick={() => { setSearch(""); setPersonSlug(""); setTagSlug(""); }}
            style={{
              color: "var(--coral)",
              fontSize: "13px",
              cursor: "pointer",
              background: "none",
              border: "none",
              fontFamily: "inherit",
              padding: 0,
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
