"use client";

import type { CSSProperties, ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  BILETY_OPTIONS,
  hasActiveTrasyFilters,
  providerLabel,
  trasyHref,
  type EventFacets,
  type TrasyFilters,
} from "@/lib/events";

const controlStyle = (active: boolean): CSSProperties => ({
  color: "var(--paper)",
  border: active ? "1px solid var(--coral)" : "1px solid rgba(239, 232, 220, .42)",
  background: active ? "rgba(232, 89, 74, .22)" : "rgba(239, 232, 220, .10)",
  colorScheme: "dark",
});

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span
        className="mono text-xs uppercase"
        style={{ color: "var(--paper-mute)", letterSpacing: ".14em" }}
      >
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

  const go = (next: Partial<TrasyFilters>) => {
    router.push(trasyHref({ ...filters, ...next }), { scroll: false });
  };

  return (
    <div role="search" aria-label="Filtruj trasy" className="mb-8 flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Field label="Standuper">
          <select
            className="min-h-10 w-full rounded-[10px] px-3 text-sm font-bold"
            style={controlStyle(Boolean(filters.osoba))}
            value={filters.osoba}
            onChange={(event) => go({ osoba: event.target.value })}
          >
            <option value="">Wszyscy</option>
            {facets.people.map((person) => (
              <option key={person.slug} value={person.slug}>
                {person.name}
              </option>
            ))}
          </select>
        </Field>
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
        <Field label="Portal">
          <select
            className="min-h-10 w-full rounded-[10px] px-3 text-sm font-bold"
            style={controlStyle(Boolean(filters.portal))}
            value={filters.portal}
            onChange={(event) => go({ portal: event.target.value as TrasyFilters["portal"] })}
          >
            <option value="">Wszystkie</option>
            {facets.portals.map((portal) => (
              <option key={portal} value={portal}>
                {providerLabel(portal)}
              </option>
            ))}
          </select>
        </Field>
      </div>

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
