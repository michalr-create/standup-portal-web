"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { readHomeCity } from "@/app/konto/place-actions";
import { cityLandingByName, cityLandingHref } from "@/lib/city-landings";
import { parseTrasySearchParams } from "@/lib/events";
import { hrefWithDefaultCity, matchHomeCity } from "@/lib/home-city";

/**
 * If the URL has no miasto key, replace it with the saved city when that city
 * is actually in this page's list. `?miasto=` stays put, so "clear" sticks.
 */
export default function HomeCityRedirect({
  pathname,
  cities,
}: {
  pathname: "/trasy" | "/open-mic";
  cities: readonly string[];
}) {
  const router = useRouter();
  const citiesKey = cities.join("\n");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    const current = new URLSearchParams(window.location.search);
    if (current.has("miasto")) return;
    const known = citiesKey ? citiesKey.split("\n") : [];
    if (known.length === 0) return;
    started.current = true;
    let cancelled = false;
    void readHomeCity().then((home) => {
      if (cancelled) return;
      const match = matchHomeCity(home, known);
      if (!match) return;
      if (window.location.pathname !== pathname) return;
      const href = hrefWithDefaultCity(pathname, window.location.search, match);
      if (!href) return;
      if (pathname === "/trasy") {
        const landing = cityLandingByName(match);
        if (landing) {
          const parsed = parseTrasySearchParams(Object.fromEntries(current.entries()));
          router.replace(cityLandingHref(landing.slug, { ...parsed.filters, page: parsed.page }), { scroll: false });
          return;
        }
      }
      router.replace(href, { scroll: false });
    });
    return () => {
      cancelled = true;
    };
  }, [citiesKey, pathname, router]);

  return null;
}
