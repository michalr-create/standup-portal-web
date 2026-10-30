"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  OPEN_MIC_LANGUAGES,
  OPEN_MIC_WEEKDAYS,
  hasActiveOpenMicFilters,
  languageLabel,
  openMicHref,
  type OpenMicFilters,
  type OpenMicLanguage,
  type OpenMicWeekday,
} from "@/lib/open-mics";

const labelStyle: CSSProperties = { color: "var(--paper-mute)", letterSpacing: ".14em" };

function controlStyle(active: boolean): CSSProperties {
  return {
    color: "var(--paper)",
    border: active ? "1px solid var(--coral)" : "1px solid rgba(239, 232, 220, .42)",
    background: active ? "rgba(232, 89, 74, .22)" : "rgba(239, 232, 220, .10)",
    colorScheme: "dark",
  };
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="mono text-xs uppercase" style={labelStyle}>
        {label}
      </span>
      {children}
    </label>
  );
}

export default function OpenMicFilters({
  filters,
  cities,
}: {
  filters: OpenMicFilters;
  cities: readonly string[];
}) {
  const router = useRouter();
  const active = hasActiveOpenMicFilters(filters);
  const go = (next: Partial<OpenMicFilters>) => {
    router.push(openMicHref({ ...filters, ...next }), { scroll: false });
  };

  return (
    <div role="search" aria-label="Filtruj open miki" className="mb-8 flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Miasto">
          <select
            className="min-h-11 w-full rounded-[10px] px-3 text-sm font-bold"
            style={controlStyle(Boolean(filters.miasto))}
            value={filters.miasto}
            onChange={(event) => go({ miasto: event.target.value })}
          >
            <option value="">Wszystkie</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Dzień tygodnia">
          <select
            className="min-h-11 w-full rounded-[10px] px-3 text-sm font-bold"
            style={controlStyle(Boolean(filters.dzien))}
            value={filters.dzien ? String(filters.dzien) : ""}
            onChange={(event) => {
              const day = Number(event.target.value);
              go({ dzien: day >= 1 && day <= 7 ? (day as OpenMicWeekday) : 0 });
            }}
          >
            <option value="">Wszystkie</option>
            {OPEN_MIC_WEEKDAYS.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Język">
          <select
            className="min-h-11 w-full rounded-[10px] px-3 text-sm font-bold"
            style={controlStyle(Boolean(filters.jezyk))}
            value={filters.jezyk}
            onChange={(event) => go({ jezyk: event.target.value as OpenMicLanguage | "" })}
          >
            <option value="">Wszystkie</option>
            {OPEN_MIC_LANGUAGES.map((language) => (
              <option key={language} value={language}>
                {languageLabel(language)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {active && (
        <Link
          href="/open-mic"
          className="inline-flex min-h-11 items-center self-start rounded-sm font-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]"
          style={{ color: "var(--coral)" }}
        >
          Wyczyść filtry
        </Link>
      )}
    </div>
  );
}
