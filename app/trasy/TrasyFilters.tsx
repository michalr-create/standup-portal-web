"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  BILETY_OPTIONS,
  hasActiveTrasyFilters,
  peopleSelectOptions,
  topFacetCities,
  trasyHref,
  type EventFacets,
  type TrasyFilters,
} from "@/lib/events";

const PERSON_LIST_FILTER_AFTER = 40;

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

export default function TrasyFilters({
  filters,
  facets,
  today,
}: {
  filters: TrasyFilters;
  facets: EventFacets;
  today: string;
}) {
  const router = useRouter();
  const active = hasActiveTrasyFilters(filters);
  const [personQuery, setPersonQuery] = useState("");
  const showPersonFilter = facets.people.length > PERSON_LIST_FILTER_AFTER;
  const people = peopleSelectOptions(
    facets.people,
    showPersonFilter ? personQuery : "",
    filters.osoba,
  );
  const cityChips = topFacetCities(facets.cities);

  const go = (next: Partial<TrasyFilters>) => {
    router.push(trasyHref({ ...filters, ...next }), { scroll: false });
  };

  return (
    <div role="search" aria-label="Filtruj trasy" className="mb-8 flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="trasy-osoba" className="mono text-xs uppercase" style={labelStyle}>
            Standuper
          </label>
          {showPersonFilter && (
            <input
              type="search"
              value={personQuery}
              onChange={(event) => setPersonQuery(event.target.value)}
              placeholder="Filtruj listę"
              aria-label="Filtruj listę"
              autoComplete="off"
              spellCheck={false}
              className="min-h-10 w-full rounded-[10px] px-3 text-sm font-bold placeholder:text-[var(--paper-mute)]"
              style={controlStyle(personQuery.trim().length > 0)}
            />
          )}
          <select
            id="trasy-osoba"
            className="min-h-10 w-full rounded-[10px] px-3 text-sm font-bold"
            style={controlStyle(Boolean(filters.osoba))}
            value={filters.osoba}
            onChange={(event) => go({ osoba: event.target.value })}
          >
            <option value="">Wszyscy</option>
            {people.map((person) => (
              <option key={person.slug} value={person.slug}>
                {person.name}
              </option>
            ))}
          </select>
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
        <Field label="Od">
          <input
            type="date"
            className="min-h-10 w-full rounded-[10px] px-3 text-sm font-bold"
            style={controlStyle(Boolean(filters.od))}
            min={today}
            value={filters.od}
            onChange={(event) => go({ od: event.target.value })}
          />
        </Field>
        <Field label="Do">
          <input
            type="date"
            className="min-h-10 w-full rounded-[10px] px-3 text-sm font-bold"
            style={controlStyle(Boolean(filters.doDnia))}
            min={filters.od || today}
            value={filters.doDnia}
            onChange={(event) => go({ doDnia: event.target.value })}
          />
        </Field>
      </div>

      {cityChips.length > 0 && (
        <div
          className="flex max-w-full flex-wrap items-center gap-2"
          role="group"
          aria-label="Popularne miasta"
        >
          {cityChips.map((city) => {
            const pressed = filters.miasto === city;
            return (
              <button
                key={city}
                type="button"
                className={pressed ? "chip active min-h-10 max-w-full" : "chip min-h-10 max-w-full"}
                aria-pressed={pressed}
                onClick={() => go({ miasto: pressed ? "" : city })}
              >
                {city}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
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
        {active && (
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
  );
}
