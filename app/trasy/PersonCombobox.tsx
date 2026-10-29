"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import {
  comboboxTypedValue,
  personComboboxActiveIndex,
  personComboboxOptions,
} from "@/lib/events";

type Person = { slug: string; name: string };

const controlStyle = (active: boolean): CSSProperties => ({
  color: "var(--paper)",
  border: active ? "1px solid var(--coral)" : "1px solid rgba(239, 232, 220, .42)",
  background: active ? "rgba(232, 89, 74, .22)" : "rgba(239, 232, 220, .10)",
  colorScheme: "dark",
});

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={open ? "h-4 w-4 rotate-180" : "h-4 w-4"}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M5 7.5 10 12.5 15 7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function PersonCombobox({
  people,
  selectedSlug,
  onSelect,
}: {
  people: readonly Person[];
  selectedSlug: string;
  onSelect: (slug: string) => void;
}) {
  const listId = "trasy-osoba-listbox";
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const replacePending = useRef(false);
  const closeTimer = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [optimistic, setOptimistic] = useState<{ slug: string; from: string } | null>(null);
  const [prevSelectedSlug, setPrevSelectedSlug] = useState(selectedSlug);
  if (selectedSlug !== prevSelectedSlug) {
    setPrevSelectedSlug(selectedSlug);
    if (optimistic) setOptimistic(null);
  }
  const effectiveSlug = optimistic && optimistic.from === selectedSlug ? optimistic.slug : selectedSlug;
  const selected = people.find((person) => person.slug === effectiveSlug) ?? null;
  const selectedName = selected?.name ?? "";
  const options = useMemo(
    () => personComboboxOptions(people, open ? query : ""),
    [people, open, query],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [trackedQuery, setTrackedQuery] = useState(query);
  const [trackedOpen, setTrackedOpen] = useState(open);
  const [trackedSlug, setTrackedSlug] = useState(effectiveSlug);
  if (query !== trackedQuery || open !== trackedOpen || effectiveSlug !== trackedSlug) {
    setTrackedQuery(query);
    setTrackedOpen(open);
    setTrackedSlug(effectiveSlug);
    setActiveIndex(personComboboxActiveIndex(options, open ? query : "", effectiveSlug));
  }
  const safeIndex = options.length === 0 ? -1 : Math.min(Math.max(activeIndex, 0), options.length - 1);
  const showClear = effectiveSlug !== "" || (open && query.trim() !== "");
  const closedValue = effectiveSlug === "" ? "" : selectedName || effectiveSlug;

  const cancelClose = () => {
    if (closeTimer.current == null) return;
    window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };

  const closeList = () => {
    cancelClose();
    replacePending.current = false;
    setOpen(false);
    setQuery("");
  };
  const closeListRef = useRef(closeList);
  closeListRef.current = closeList;

  const commit = (slug: string) => {
    closeList();
    if (slug === effectiveSlug) return;
    setOptimistic({ slug, from: selectedSlug });
    onSelect(slug);
  };

  const openList = () => {
    if (open) return;
    replacePending.current = effectiveSlug !== "";
    setQuery("");
    setOpen(true);
  };

  const clear = () => {
    cancelClose();
    replacePending.current = false;
    setQuery("");
    setOpen(true);
    if (effectiveSlug) {
      setOptimistic({ slug: "", from: selectedSlug });
      onSelect("");
    }
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
  }, [open, safeIndex, options]);

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
        replacePending.current = false;
        setQuery("");
        setOpen(true);
        return;
      }
      if (options.length === 0) return;
      setActiveIndex(Math.min(safeIndex + 1, options.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        replacePending.current = false;
        setQuery("");
        setOpen(true);
        return;
      }
      if (options.length === 0) return;
      setActiveIndex(Math.max(safeIndex - 1, 0));
      return;
    }
    if (event.key === "Home" && open) {
      event.preventDefault();
      if (options.length > 0) setActiveIndex(0);
      return;
    }
    if (event.key === "End" && open) {
      event.preventDefault();
      if (options.length > 0) setActiveIndex(options.length - 1);
      return;
    }
    if (event.key === "Enter") {
      if (!open) return;
      event.preventDefault();
      const option = safeIndex >= 0 ? options[safeIndex] : undefined;
      if (option) commit(option.slug);
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
    <div ref={rootRef} className={open ? "relative z-30 min-w-0" : "relative min-w-0"}>
      <input
        ref={inputRef}
        id="trasy-osoba"
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && safeIndex >= 0 ? `${listId}-opt-${safeIndex}` : undefined}
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        placeholder={open ? "Szukaj standupera\u2026" : "Wszyscy"}
        value={open ? query : closedValue}
        onFocus={() => openList()}
        onClick={() => openList()}
        onBlur={scheduleClose}
        onChange={(event) => {
          const next = comboboxTypedValue(event.target.value, selectedName, replacePending.current);
          replacePending.current = false;
          setQuery(next);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        className={
          showClear
            ? "min-h-10 w-full min-w-0 rounded-[10px] py-2 pl-3 pr-20 text-sm font-bold outline-none placeholder:text-[var(--paper-mute)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]"
            : "min-h-10 w-full min-w-0 rounded-[10px] py-2 pl-3 pr-9 text-sm font-bold outline-none placeholder:text-[var(--paper-mute)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]"
        }
        style={controlStyle(Boolean(effectiveSlug) || (open && query.trim().length > 0))}
      />
      {showClear && (
        <button
          type="button"
          aria-label="Wyczyść standupera"
          onPointerDown={(event) => event.preventDefault()}
          onClick={clear}
          className="absolute inset-y-0 right-8 flex w-10 items-center justify-center text-lg"
          style={{ color: "var(--paper-dim)", background: "none", border: "none", fontFamily: "inherit" }}
        >
          ×
        </button>
      )}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-2 flex items-center"
        style={{ color: "var(--paper-mute)" }}
      >
        <Chevron open={open} />
      </span>
      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="Standuperzy"
          className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-y-auto overscroll-contain rounded-[10px] py-1 shadow-lg"
          style={{
            background: "var(--ink-3)",
            border: "1px solid rgba(239, 232, 220, .42)",
            color: "var(--paper)",
          }}
          onPointerDown={() => cancelClose()}
          onScroll={() => cancelClose()}
        >
          {options.length === 0 ? (
            <li className="px-3 py-2 text-sm" style={{ color: "var(--paper-mute)" }} role="presentation">
              Brak wyników
            </li>
          ) : (
            options.map((option, index) => {
              const selectedOption = option.slug === effectiveSlug;
              const active = index === safeIndex;
              return (
                <li
                  key={option.slug || "all"}
                  id={`${listId}-opt-${index}`}
                  role="option"
                  aria-selected={selectedOption}
                  data-index={index}
                  className="flex min-h-11 cursor-pointer select-none items-center gap-2 px-3 text-left text-sm"
                  style={{
                    background: active ? "rgba(232, 89, 74, .28)" : "transparent",
                    fontWeight: selectedOption ? 800 : 700,
                  }}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    cancelClose();
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => commit(option.slug)}
                >
                  <span className="min-w-0 flex-1">{option.name}</span>
                  {selectedOption && (
                    <span aria-hidden="true" style={{ color: "var(--coral)" }}>
                      ✓
                    </span>
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
