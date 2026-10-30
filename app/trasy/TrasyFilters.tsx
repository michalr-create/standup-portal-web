"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  BILETY_OPTIONS,
  activeTrasyFilterCount,
  topFacetCities,
  trasyHref,
  type EventFacets,
  type TrasyFilters,
} from "@/lib/events";
import PersonCombobox from "./PersonCombobox";

const controlStyle = (active: boolean): CSSProperties => ({
  color: "var(--paper)",
  border: active ? "1px solid var(--coral)" : "1px solid rgba(239, 232, 220, .42)",
  background: active ? "rgba(232, 89, 74, .22)" : "rgba(239, 232, 220, .10)",
  colorScheme: "dark",
});

const labelStyle: CSSProperties = { color: "var(--paper-mute)", letterSpacing: ".14em" };

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="mono text-xs uppercase" style={labelStyle}>
        {label}
      </span>
      {children}
    </label>
  );
}

function formatPlDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  return `${match[3]}.${match[2]}.${match[1]}`;
}

function DateControl({
  active,
  min,
  value,
  onChange,
}: {
  active: boolean;
  min: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <span className="relative block min-w-0">
      <input
        type="date"
        lang="pl"
        className="trasy-date min-h-10 w-full min-w-0 max-w-full rounded-[10px] px-2 text-sm font-bold sm:px-3 trasy-date-mask"
        style={{ ...controlStyle(active), color: "transparent", minWidth: 0, maxWidth: "100%" }}
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-2 right-8 flex items-center truncate text-sm font-bold sm:left-3"
        style={{ color: value ? "var(--paper)" : "var(--paper-mute)" }}
      >
        {value ? formatPlDate(value) : "dd.mm.rrrr"}
      </span>
    </span>
  );
}

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

export default function TrasyFilters({
  filters,
  facets,
  today,
  children,
}: {
  filters: TrasyFilters;
  facets: EventFacets;
  today: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const activeCount = activeTrasyFilterCount(filters);
  const cityChips = topFacetCities(facets.cities);
  // First paint follows the URL. Later chip taps update props without remounting,
  // so the panel stays where the reader left it.
  const [open, setOpen] = useState(activeCount > 0);
  const [navOffset, setNavOffset] = useState(69);

  useEffect(() => {
    const nav = document.querySelector("nav");
    if (!nav) return;
    const sync = () => setNavOffset(Math.round(nav.getBoundingClientRect().height));
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(nav);
    return () => observer.disconnect();
  }, []);

  const go = (next: Partial<TrasyFilters>) => {
    router.push(trasyHref({ ...filters, ...next }), { scroll: false });
  };

  const fieldsClass = open
    ? "order-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:order-none lg:grid-cols-4"
    : "order-2 hidden grid-cols-1 gap-3 sm:grid-cols-2 lg:order-none lg:grid lg:grid-cols-4";
  const statusClass = open
    ? "order-3 flex flex-wrap items-center gap-2 lg:order-none"
    : "order-3 hidden flex-wrap items-center gap-2 lg:order-none lg:flex";

  return (
    <div>
      <div className="sticky z-30 mb-3 bg-[var(--ink)] py-2 lg:hidden" style={{ top: navOffset }}>
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]"
          style={controlStyle(open || activeCount > 0)}
          aria-expanded={open}
          aria-controls="trasy-filter-fields trasy-filter-status"
          onClick={() => setOpen((value) => !value)}
        >
          Filtry
          {activeCount > 0 && (
            <span
              className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-black"
              style={{ background: "var(--coral)", color: "var(--ink)" }}
            >
              <span className="sr-only">, aktywne: </span>
              {activeCount}
            </span>
          )}
          <Chevron open={open} />
        </button>
      </div>

      <div role="search" aria-label="Filtruj trasy" className="mb-6 flex flex-col gap-3 lg:mb-8 lg:gap-4">
        <div id="trasy-filter-fields" className={fieldsClass}>
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor="trasy-osoba" className="mono text-xs uppercase" style={labelStyle}>
              Standuper
            </label>
            <PersonCombobox
              people={facets.people}
              selectedSlug={filters.osoba}
              onSelect={(osoba) => go({ osoba })}
            />
          </div>
          <Field label="Miasto">
            <select
              className="min-h-10 w-full rounded-[10px] px-3 text-sm font-bold"
              style={controlStyle(Boolean(filters.miasto))}
              value={filters.miasto}
              onChange={(event) => go({ miasto: event.target.value })}
            >
              <option value="">Wszystkie</option>
              {facets.cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid min-w-0 grid-cols-2 gap-3 sm:col-span-2 lg:col-span-2">
            <Field label="Od">
              <DateControl
                active={Boolean(filters.od)}
                min={today}
                value={filters.od}
                onChange={(od) => go({ od })}
              />
            </Field>
            <Field label="Do">
              <DateControl
                active={Boolean(filters.doDnia)}
                min={filters.od || today}
                value={filters.doDnia}
                onChange={(doDnia) => go({ doDnia })}
              />
            </Field>
          </div>
        </div>

        {cityChips.length > 0 && (
          <div
            className="order-1 flex max-w-full items-center gap-2 overflow-x-auto scrollbar-hide lg:order-none lg:flex-wrap lg:overflow-visible"
            role="group"
            aria-label="Popularne miasta"
          >
            {cityChips.map((city) => {
              const pressed = filters.miasto === city;
              return (
                <button
                  key={city}
                  type="button"
                  className={
                    pressed
                      ? "chip active min-h-10 shrink-0 whitespace-nowrap"
                      : "chip min-h-10 shrink-0 whitespace-nowrap"
                  }
                  aria-pressed={pressed}
                  onClick={() => go({ miasto: pressed ? "" : city })}
                >
                  {city}
                </button>
              );
            })}
          </div>
        )}

        <div id="trasy-filter-status" className={statusClass}>
          {BILETY_OPTIONS.map((option) => {
            const pressed = filters.bilety === option.value;
            return (
              <button
                key={option.label}
                type="button"
                className={pressed ? "chip active min-h-10" : "chip min-h-10"}
                aria-pressed={pressed}
                onClick={() => {
                  if (filters.bilety !== option.value) go({ bilety: option.value });
                }}
              >
                {option.label}
              </button>
            );
          })}
          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => router.push("/trasy", { scroll: false })}
              className="min-h-11 px-2 text-sm font-bold"
              style={{ color: "var(--coral)", background: "none", border: "none", fontFamily: "inherit" }}
            >
              Wyczyść filtry ×
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
