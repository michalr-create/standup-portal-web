"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ScrollRow from "./ScrollRow";
import { useLibrary } from "./LibraryProvider";
import { WATCH_LATER_HOME_LIMIT } from "@/lib/favorite-feed";
import type { Item } from "@/lib/data";

export default function WatchLaterSection() {
  const library = useLibrary();
  const [items, setItems] = useState<Item[]>([]);
  const [ready, setReady] = useState(false);
  const laterKey = library.later.join(",");

  useEffect(() => {
    if (!library.ready || !library.signedIn) {
      setItems([]);
      setReady(true);
      return;
    }
    const ids = laterKey
      ? laterKey.split(",").map((value) => Number(value)).filter((id) => id > 0).slice(0, WATCH_LATER_HOME_LIMIT)
      : [];
    if (ids.length === 0) {
      setItems([]);
      setReady(true);
      return;
    }
    let cancelled = false;
    fetch("/api/library-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    })
      .then((response) => response.json())
      .then((body: { items?: Item[] }) => {
        if (cancelled) return;
        const loaded = Array.isArray(body?.items) ? body.items : [];
        const order = new Map(ids.map((id, index) => [id, index]));
        setItems(loaded.filter((item) => order.has(item.id)).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)));
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [library.ready, library.signedIn, laterKey]);

  if (!library.ready || !library.signedIn || library.later.length === 0 || !ready || items.length === 0) return null;

  return (
    <section className="band">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between mb-8 gap-6 flex-wrap">
          <div className="flex items-baseline gap-4 flex-wrap">
            <h2 className="font-black m-0 leading-none" style={{ fontSize: "clamp(32px, 4vw, 44px)", letterSpacing: "-.025em" }}>
              Do obejrzenia<span className="dot-accent">.</span>
            </h2>
            <span className="mono text-xs uppercase" style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}>
              {library.later.length}
            </span>
          </div>
          <Link
            href="/ulubione#do-obejrzenia"
            className="mono text-xs uppercase pb-0.5 transition-colors hover:text-white"
            style={{ color: "var(--paper-dim)", letterSpacing: ".14em", borderBottom: "1px solid var(--line-2)" }}
          >
            {"Ca\u0142a lista \u2192"}
          </Link>
        </div>
        <ScrollRow items={items} />
      </div>
    </section>
  );
}
