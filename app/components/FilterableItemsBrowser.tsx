"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import type { Item } from "@/lib/data";
import { categoryBrowseHref } from "@/lib/category-browse";
import ItemsBrowser from "./ItemsBrowser";
import type { ItemsBrowserVariant } from "./itemsBrowserLayout";
import { sortStandupTagChips } from "./standupTagChipOrder";
import { tagDisplayName } from "./tagDisplayName";
import {
  pendingTagAfterServerFilters,
  serverFilterKey,
  tagChipClick,
} from "./tagChipPending";

type FacetPerson = { slug: string; name: string };
type FacetTag = { name: string; slug: string; tag_type: string };

export type ServerItemFilters = {
  pathname: string;
  personSlug: string;
  tagSlug: string;
  search: string;
  people: FacetPerson[];
  tags: FacetTag[];
};

type CountWord = { one: string; many: string };

const CHIP_ROW_MOBILE = "(max-width: 767px)";

const filterStyles = `
.fib-filters {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
  min-width: 0;
  max-width: 100%;
}
.fib-search {
  width: 100%;
  min-width: 0;
}
.fib-person-wrap {
  position: relative;
  min-width: 0;
  max-width: 100%;
}
.fib-person {
  -webkit-appearance: none;
  appearance: none;
  width: auto;
  max-width: 100%;
  min-height: 40px;
  margin: 0;
  background-color: transparent;
  background-image: linear-gradient(rgba(239, 232, 220, .10), rgba(239, 232, 220, .10));
  background-repeat: no-repeat;
  background-position: right center;
  background-size: 34px 100%;
  color: var(--paper);
  border: 1px solid rgba(239, 232, 220, .42);
  border-radius: 10px;
  padding: 0 36px 0 12px;
  font-size: 14px;
  font-weight: 700;
  font-family: inherit;
  line-height: 1.2;
  cursor: pointer;
  box-sizing: border-box;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fib-person[data-active="true"] {
  border-color: var(--coral);
  background-image: linear-gradient(rgba(232, 89, 74, .22), rgba(232, 89, 74, .22));
}
.fib-person-chevron {
  position: absolute;
  top: 50%;
  right: 12px;
  width: 0;
  height: 0;
  margin-top: -3px;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 7px solid var(--paper);
  pointer-events: none;
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
  .fib-filters {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
    margin-bottom: 12px;
    align-items: stretch;
  }
  .fib-search {
    grid-column: 1;
    grid-row: 1;
    width: auto;
  }
  .fib-filters:not(:has(.fib-person)) .fib-search {
    grid-column: 1 / -1;
  }
  .fib-person-wrap {
    grid-column: 2;
    grid-row: 1;
    width: clamp(8.5rem, 42vw, 11rem);
  }
  .fib-person {
    width: 100%;
  }
  .fib-chip-scroller {
    grid-column: 1 / -1;
    grid-row: 2;
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
  .fib-filters {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    column-gap: 10px;
    row-gap: 12px;
  }
  .fib-search {
    flex: 1 0 100%;
  }
  .fib-person {
    field-sizing: content;
    max-width: 18rem;
  }
  /* Chips stay in the same wrapping row as the person select. */
  .fib-chip-scroller,
  .fib-chip-row {
    display: contents;
  }
}
.fib-chip-dots {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  pointer-events: none;
}
.fib-chip-dots > span {
  display: block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  animation: fib-chip-dot 0.9s infinite ease-in-out both;
}
.fib-chip-dots > span:nth-child(2) { animation-delay: 0.15s; }
.fib-chip-dots > span:nth-child(3) { animation-delay: 0.3s; }
@keyframes fib-chip-dot {
  0%, 80%, 100% { opacity: 0.28; }
  40% { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .fib-chip-dots > span {
    animation: none;
    opacity: 1;
  }
}
`;

const TAG_CHIP_PENDING_MS = 10_000;

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
  serverFiltered = false,
): string {
  if (catalogTotal != null && (serverFiltered || !isFiltered)) {
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

function useUrlSearch(committed: string, enabled: boolean, commit: (value: string) => void) {
  const [draft, setDraft] = useState(committed);
  const draftRef = useRef(draft);
  const inputRef = useRef<HTMLInputElement>(null);
  const commitRef = useRef(commit);
  draftRef.current = draft;
  commitRef.current = commit;

  useEffect(() => {
    const input = inputRef.current;
    if (input && document.activeElement === input) return;
    setDraft(committed);
  }, [committed]);

  useEffect(() => {
    if (!enabled) return;
    if (draft.trim() === committed.trim()) return;
    const handle = window.setTimeout(() => {
      const latest = draftRef.current.trim();
      if (latest === committed.trim()) return;
      commitRef.current(latest);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [draft, committed, enabled]);

  return { draft, setDraft, inputRef };
}

export default function FilterableItemsBrowser({
  items,
  countWord = { one: "pozycja", many: "pozycji" },
  catalogTotal,
  tagChipOrder = "alphabetical",
  serverFilters,
  variant,
}: {
  items: Item[];
  countWord?: CountWord;
  catalogTotal?: number;
  /** Standup category chips pin Special, Stand-up impro, then klipy. */
  tagChipOrder?: "alphabetical" | "standup";
  serverFilters?: ServerItemFilters;
  /** Portrait thumbs and a 2-column phone grid. Used by /shorts. */
  variant?: ItemsBrowserVariant;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [personSlug, setPersonSlug] = useState("");
  const [tagSlug, setTagSlug] = useState("");
  // Tag clicks soft-navigate and wait on the server render. This is set in the
  // click itself so the chip shows it is busy before that render returns.
  // Repeat clicks on that chip are ignored until the rendered filters change.
  const [pendingTagSlug, setPendingTagSlug] = useState<string | null>(null);
  const pendingTagRef = useRef<string | null>(null);
  const server = serverFilters;
  const renderedFilterKey = server
    ? serverFilterKey({
        personSlug: server.personSlug,
        tagSlug: server.tagSlug,
        search: server.search,
      })
    : "";
  const renderedFilterKeyRef = useRef(renderedFilterKey);

  useEffect(() => {
    const previous = renderedFilterKeyRef.current;
    if (previous === renderedFilterKey) return;
    renderedFilterKeyRef.current = renderedFilterKey;
    const nextPending = pendingTagAfterServerFilters(
      pendingTagRef.current,
      previous,
      renderedFilterKey,
    );
    pendingTagRef.current = nextPending;
    setPendingTagSlug(nextPending);
  }, [renderedFilterKey]);

  useEffect(() => {
    if (!pendingTagSlug) return;
    const id = window.setTimeout(() => {
      pendingTagRef.current = null;
      setPendingTagSlug(null);
    }, TAG_CHIP_PENDING_MS);
    return () => window.clearTimeout(id);
  }, [pendingTagSlug]);

  const commitSearch = (q: string) => {
    if (!server) return;
    router.replace(categoryBrowseHref(server.pathname, {
      osoba: server.personSlug,
      tag: server.tagSlug,
      q,
    }));
  };
  const { draft, setDraft, inputRef } = useUrlSearch(server?.search ?? "", !!server, commitSearch);

  const people = useMemo(() => {
    if (server) {
      return [...server.people].sort((a, b) => a.name.localeCompare(b.name, "pl"));
    }
    const map = new Map<string, string>();
    for (const item of items) {
      for (const p of item.people) {
        if (!map.has(p.slug)) map.set(p.slug, p.name);
      }
    }
    return [...map.entries()]
      .map(([slug, name]) => ({ slug, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "pl"));
  }, [items, server]);

  const availableTags = useMemo(() => {
    const sortTags = <T extends { name: string; slug: string }>(tags: T[]): T[] => {
      if (tagChipOrder === "standup") return sortStandupTagChips(tags);
      return [...tags].sort((a, b) => a.name.localeCompare(b.name, "pl"));
    };
    if (server) return sortTags(server.tags);
    const map = new Map<string, { name: string; slug: string; tag_type: string }>();
    for (const item of items) {
      for (const t of item.tags) {
        if (!map.has(t.slug)) map.set(t.slug, t);
      }
    }
    return sortTags([...map.values()]);
  }, [items, server, tagChipOrder]);

  const { rowRef, showFade } = useChipRowFade(availableTags.length);

  const activePerson = server ? server.personSlug : personSlug;
  const activeTag = server ? server.tagSlug : tagSlug;
  const activeSearch = server ? draft : search;

  const filtered = useMemo(() => {
    if (server) return items;
    let result = items;
    const q = search.trim().toLowerCase();
    if (q) result = result.filter((i) => i.title.toLowerCase().includes(q));
    if (personSlug) result = result.filter((i) => i.people.some((p) => p.slug === personSlug));
    if (tagSlug) result = result.filter((i) => i.tags.some((t) => t.slug === tagSlug));
    return result;
  }, [items, search, personSlug, tagSlug, server]);

  const isFiltered = server
    ? !!(server.personSlug || server.tagSlug || server.search || draft.trim())
    : !!search.trim() || !!personSlug || !!tagSlug;

  const goToFilters = (next: { osoba?: string; tag?: string; q?: string }) => {
    if (!server) return;
    router.push(categoryBrowseHref(server.pathname, {
      osoba: next.osoba ?? server.personSlug,
      tag: next.tag ?? server.tagSlug,
      q: next.q ?? draft.trim(),
    }));
  };

  const inputBase: React.CSSProperties = {
    background: "rgba(255,255,255,.06)",
    border: "1px solid var(--line)",
    color: "var(--paper)",
    borderRadius: "10px",
    padding: "0 14px",
    height: "40px",
    fontSize: "15px",
    lineHeight: "38px",
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
  };

  return (
    <div>
      <style>{filterStyles}</style>
      <div className="fib-filters">
        <input
          ref={inputRef}
          className="fib-search"
          type="search"
          placeholder={"Szukaj po tytule\u2026"}
          value={activeSearch}
          onChange={(e) => {
            if (server) setDraft(e.target.value);
            else setSearch(e.target.value);
          }}
          aria-label={"Szukaj po tytule"}
          style={inputBase}
        />

        {people.length > 0 && (
          <div className="fib-person-wrap">
            <select
              className="fib-person"
              data-active={activePerson ? "true" : "false"}
              aria-label="Standuper"
              value={activePerson}
              onChange={(e) => {
                if (server) goToFilters({ osoba: e.target.value });
                else setPersonSlug(e.target.value);
              }}
            >
              <option value="">Wszyscy</option>
              {people.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </select>
            <span className="fib-person-chevron" aria-hidden="true" />
          </div>
        )}

        {availableTags.length > 0 && (
          <div className="fib-chip-scroller">
                <div ref={rowRef} className="fib-chip-row scrollbar-hide">
                  {availableTags.map((tag) => {
                    const active = activeTag === tag.slug;
                    const label = tagDisplayName(tag.name);
                    const isChipPending = pendingTagSlug === tag.slug;
                    return (
                      <button
                        key={tag.slug}
                        type="button"
                        aria-pressed={active}
                        aria-busy={isChipPending || undefined}
                        aria-disabled={isChipPending || undefined}
                        aria-label={isChipPending ? `${label}, \u0142adowanie` : undefined}
                        onClick={() => {
                          const next = active ? "" : tag.slug;
                          if (!server) {
                            setTagSlug(next);
                            return;
                          }
                          const action = tagChipClick(pendingTagRef.current, activeTag, tag.slug);
                          if (action.type === "ignore") return;
                          pendingTagRef.current = action.pendingChipSlug;
                          flushSync(() => setPendingTagSlug(action.pendingChipSlug));
                          goToFilters({ tag: action.tag });
                        }}
                        style={{
                          position: "relative",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: active ? "var(--coral)" : "rgba(255,255,255,.06)",
                          border: `1px solid ${active ? "var(--coral)" : "var(--line)"}`,
                          color: active ? "#fff" : "var(--paper-dim)",
                          borderRadius: "20px",
                          padding: "0 14px",
                          minHeight: "40px",
                          fontSize: "14px",
                          fontWeight: active ? 700 : 400,
                          cursor: isChipPending ? "progress" : "pointer",
                          transition: "background 0.15s, border-color 0.15s, color 0.15s",
                          fontFamily: "inherit",
                          lineHeight: 1,
                          flexShrink: 0,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {isChipPending && (
                          <span className="fib-chip-dots" aria-hidden="true">
                            <span />
                            <span />
                            <span />
                          </span>
                        )}
                        <span style={isChipPending ? { visibility: "hidden" } : undefined}>{label}</span>
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

      <div className="flex items-center justify-between gap-3 mb-5">
        <span
          className="mono text-xs uppercase"
          style={{ color: "var(--paper-mute)", letterSpacing: ".16em", minWidth: 0, flex: "1 1 auto" }}
        >
          {countLabel(filtered.length, items.length, countWord, isFiltered, catalogTotal, !!server)}
        </span>
        {isFiltered && (
          <button
            type="button"
            onClick={() => {
              if (server) {
                setDraft("");
                router.push(server.pathname);
                return;
              }
              setSearch("");
              setPersonSlug("");
              setTagSlug("");
            }}
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

      <div aria-busy={pendingTagSlug ? true : undefined}>
        <ItemsBrowser items={filtered} variant={variant} />
      </div>
    </div>
  );
}
