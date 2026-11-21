"use client";

import { useEffect, useMemo, useState } from "react";
import ScrollRow from "./ScrollRow";
import SectionHead from "./SectionHead";
import { useLibrary } from "./LibraryProvider";
import { homeWatchLaterIds, orderWatchLaterItems } from "@/lib/favorite-feed";
import type { Item } from "@/lib/data";

export default function WatchLaterSection() {
  const library = useLibrary();
  const ids = useMemo(
    () => (library.ready ? homeWatchLaterIds(library.later) : []),
    [library.ready, library.later],
  );
  const [loaded, setLoaded] = useState<Item[]>([]);

  useEffect(() => {
    if (!library.ready || ids.length === 0) return;
    let cancelled = false;
    fetch("/api/library-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("library-items");
        return response.json();
      })
      .then((body: { items?: Item[] }) => {
        if (cancelled) return;
        setLoaded(Array.isArray(body?.items) ? body.items : []);
      })
      .catch(() => {
        // Keep cards already on screen. Ids that left the list are filtered out below.
      });
    return () => {
      cancelled = true;
    };
  }, [library.ready, ids]);

  const items = useMemo(() => orderWatchLaterItems(loaded, ids), [loaded, ids]);
  if (items.length === 0) return null;

  return (
    <section className="band">
      <div className="max-w-6xl mx-auto">
        <SectionHead
          title="Do obejrzenia"
          sub={String(library.later.length)}
          linkHref="/ulubione#do-obejrzenia"
          linkText={"Zobacz wszystkie \u2192"}
        />
        <ScrollRow items={items} />
      </div>
    </section>
  );
}
