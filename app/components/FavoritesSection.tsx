"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FAVORITE_FEED_DEFAULT } from "@/lib/favorite-feed";
import ScrollRow from "./ScrollRow";
import { useLibrary } from "./LibraryProvider";
import type { Item } from "@/lib/data";

export default function FavoritesSection() {
  const library = useLibrary();
  const [items, setItems] = useState<Item[]>([]);
  const [ready, setReady] = useState(false);
  const [hasFavs, setHasFavs] = useState(false);
  const personKey = library.people.join("\n");
  const showKey = library.shows.join("\n");

  useEffect(() => {
    if (!library.ready) return;
    const personSlugs = personKey ? personKey.split("\n") : [];
    const showSlugs = showKey ? showKey.split("\n") : [];

    if (personSlugs.length === 0 && showSlugs.length === 0) {
      setHasFavs(false);
      setItems([]);
      setReady(true);
      return;
    }

    setHasFavs(true);
    let cancelled = false;

    fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ person_slugs: personSlugs, show_slugs: showSlugs, limit: FAVORITE_FEED_DEFAULT }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setItems((data.items || []) as Item[]);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [library.ready, personKey, showKey]);

  if (!ready || !hasFavs || items.length === 0) return null;

  return (
    <section className="band" style={{ background: "linear-gradient(180deg, #100E0A 0%, #0B0B0B 100%)" }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between mb-8 gap-6 flex-wrap">
          <div className="flex items-baseline gap-4 flex-wrap">
            <h2 className="font-black m-0 leading-none" style={{ fontSize: "clamp(32px, 4vw, 44px)", letterSpacing: "-.025em" }}>
              Twoje ulubione<span className="dot-accent">.</span>
            </h2>
            <span className="mono text-xs uppercase" style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}>
              Na podstawie Twoich polubie{"\u0144"}
            </span>
          </div>
          <Link
            href="/ulubione"
            className="mono text-xs uppercase pb-0.5 transition-colors hover:text-white"
            style={{ color: "var(--paper-dim)", letterSpacing: ".14em", borderBottom: "1px solid var(--line-2)" }}
          >
            {"Zarz\u0105dzaj ulubionymi \u2192"}
          </Link>
        </div>
        <ScrollRow items={items} />
      </div>
    </section>
  );
}
