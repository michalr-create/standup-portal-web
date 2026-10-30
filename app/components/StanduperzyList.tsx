"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { peopleSelectOptions } from "@/lib/events";
import { formatItemCount, sortPeopleByName } from "@/lib/standuperzy-directory";
import HeartButton from "./HeartButton";

type DirectoryPerson = {
  id: number;
  name: string;
  slug: string;
  itemCount: number;
};

const LIST_ID = "standuperzy-szukaj-listbox";

const fieldStyle = (active: boolean): CSSProperties => ({
  background: "var(--ink-3)",
  border: active ? "1px solid var(--coral)" : "1px solid var(--line-2)",
  color: "var(--paper)",
  colorScheme: "dark",
});

export default function StanduperzyList({ people }: { people: DirectoryPerson[] }) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const closeTimer = useRef<number | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const sorted = useMemo(() => sortPeopleByName(people), [people]);
  // Same case- and Polish-diacritic-insensitive match as the /trasy combobox.
  const filtered = useMemo(() => peopleSelectOptions(sorted, query), [sorted, query]);
  const safeIndex = filtered.length === 0 ? -1 : Math.min(Math.max(activeIndex, 0), filtered.length - 1);
  const showClear = query.length > 0;

  const cancelClose = () => {
    if (closeTimer.current == null) return;
    window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };

  const closeList = () => {
    cancelClose();
    setOpen(false);
  };
  const closeListRef = useRef(closeList);
  closeListRef.current = closeList;

  const goTo = (slug: string) => {
    if (!slug) return;
    closeList();
    router.push("/standuper/" + slug);
  };

  const clear = () => {
    cancelClose();
    setQuery("");
    setActiveIndex(0);
    setOpen(false);
    inputRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (rootRef.current?.contains(target)) return;
      closeListRef.current();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open || safeIndex < 0) return;
    const list = listRef.current;
    const option = list?.querySelector<HTMLElement>(`[data-index="${safeIndex}"]`);
    if (!list || !option) return;
    const top = option.offsetTop;
    const bottom = top + option.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
  }, [open, safeIndex, filtered]);

  useEffect(() => {
    const timer = closeTimer;
    return () => {
      if (timer.current != null) window.clearTimeout(timer.current);
    };
  }, []);

  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => {
      if (rootRef.current?.contains(document.activeElement)) return;
      closeList();
    }, 180);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing || event.key === "Process") return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (filtered.length === 0) return;
      setActiveIndex(Math.min(safeIndex + 1, filtered.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (filtered.length === 0) return;
      setActiveIndex(Math.max(safeIndex - 1, 0));
      return;
    }
    if (event.key === "Home" && open) {
      event.preventDefault();
      if (filtered.length > 0) setActiveIndex(0);
      return;
    }
    if (event.key === "End" && open) {
      event.preventDefault();
      if (filtered.length > 0) setActiveIndex(filtered.length - 1);
      return;
    }
    if (event.key === "Enter") {
      if (!open) return;
      event.preventDefault();
      const option = safeIndex >= 0 ? filtered[safeIndex] : undefined;
      if (option) goTo(option.slug);
      return;
    }
    if (event.key === "Escape") {
      if (!open) return;
      event.preventDefault();
      closeList();
      return;
    }
    if (event.key === "Tab") closeList();
  };

  return (
    <div className="max-w-xl">
      <div ref={rootRef} className={open ? "relative z-30 mb-6" : "relative z-20 mb-6"}>
        <input
          ref={inputRef}
          id="standuperzy-szukaj"
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? LIST_ID : undefined}
          aria-activedescendant={open && safeIndex >= 0 ? `${LIST_ID}-opt-${safeIndex}` : undefined}
          aria-label="Szukaj standupera"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          placeholder={"Szukaj standupera\u2026"}
          value={query}
          onChange={(event) => {
            const next = event.target.value;
            setQuery(next);
            setActiveIndex(0);
            setOpen(next.trim().length > 0);
          }}
          onKeyDown={onKeyDown}
          onBlur={scheduleClose}
          className={
            showClear
              ? "min-h-12 w-full rounded-full py-3 pl-4 pr-12 text-base font-bold outline-none placeholder:text-[var(--paper-mute)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]"
              : "min-h-12 w-full rounded-full py-3 pl-4 pr-4 text-base font-bold outline-none placeholder:text-[var(--paper-mute)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]"
          }
          style={fieldStyle(open || query.trim().length > 0)}
        />
        {showClear && (
          <button
            type="button"
            aria-label="Wyczyść wyszukiwanie"
            onPointerDown={(event) => event.preventDefault()}
            onClick={clear}
            className="absolute inset-y-0 right-1 flex w-11 items-center justify-center text-lg"
            style={{ color: "var(--paper-dim)", background: "none", border: "none", fontFamily: "inherit" }}
          >
            ×
          </button>
        )}
        {open && (
          <ul
            ref={listRef}
            id={LIST_ID}
            role="listbox"
            aria-label="Standuperzy"
            className="absolute left-0 right-0 z-30 mt-2 max-h-64 overflow-y-auto overscroll-contain rounded-2xl py-1 shadow-lg"
            style={{
              background: "var(--ink-3)",
              border: "1px solid var(--line-2)",
              color: "var(--paper)",
            }}
            onPointerDown={() => cancelClose()}
            onScroll={() => cancelClose()}
          >
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm" style={{ color: "var(--paper-mute)" }} role="presentation">
                Brak wyników
              </li>
            ) : (
              filtered.map((person, index) => {
                const active = index === safeIndex;
                return (
                  <li
                    key={person.id}
                    id={`${LIST_ID}-opt-${index}`}
                    role="option"
                    aria-selected={false}
                    data-index={index}
                    className="flex min-h-11 cursor-pointer select-none items-center px-4 text-left text-base"
                    style={{
                      background: active ? "rgba(232, 89, 74, .28)" : "transparent",
                      fontWeight: 700,
                    }}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      cancelClose();
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => goTo(person.slug)}
                  >
                    <span className="min-w-0 flex-1">{person.name}</span>
                  </li>
                );
              })
            )}
          </ul>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center" style={{ color: "var(--paper-mute)" }}>
          {"Nie znaleziono standuper\u00f3w pasuj\u0105cych do \u201e"}
          {query}
          {"\u201d"}
        </p>
      ) : (
        <ul className="m-0 list-none p-0" aria-label="Lista standuperów">
          {filtered.map((person) => {
            const countText = formatItemCount(person.itemCount);
            return (
              <li key={person.id} style={{ borderBottom: "1px solid var(--line)" }}>
                <div className="flex items-center gap-1">
                  <Link
                    href={"/standuper/" + person.slug}
                    className="flex min-h-12 min-w-0 flex-1 flex-col justify-center rounded-xl py-3 pl-1 pr-2 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]"
                  >
                    <span className="text-base font-bold leading-snug" style={{ color: "var(--paper)" }}>
                      {person.name}
                    </span>
                    {countText ? (
                      <span className="mono mt-0.5 text-xs" style={{ color: "var(--paper-mute)" }}>
                        {countText}
                      </span>
                    ) : null}
                  </Link>
                  <HeartButton type="person" slug={person.slug} name={person.name} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
