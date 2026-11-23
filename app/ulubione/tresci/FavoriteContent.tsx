"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ItemsBrowser from "@/app/components/ItemsBrowser";
import Pager from "@/app/components/Pager";
import { useLibrary } from "@/app/components/LibraryProvider";
import { PUBLIC_LISTING_PAGE_SIZE, clampListingPage, listingPageHref } from "@/lib/category-browse";
import type { Item } from "@/lib/data";

const PATHNAME = "/ulubione/tresci";

type FeedItem = Item & { showSlug?: string | null };

type FeedResponse = {
  items?: FeedItem[];
  total?: number;
  page?: number;
};

function asItems(rows: FeedItem[] | undefined): Item[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => ({
    ...row,
    source_id: row.source_id ?? 0,
    episode_group_id: row.episode_group_id ?? null,
    showSlug: row.showSlug ?? null,
    categorySlug: row.categorySlug ?? null,
    people: Array.isArray(row.people) ? row.people : [],
    tags: Array.isArray(row.tags) ? row.tags : [],
  }));
}

export default function FavoriteContent({ page }: { page: number }) {
  const library = useLibrary();
  const router = useRouter();
  const personKey = library.people.join("\n");
  const showKey = library.shows.join("\n");
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [loadedPage, setLoadedPage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!library.ready || !library.signedIn) return;
    const personSlugs = personKey ? personKey.split("\n") : [];
    const showSlugs = showKey ? showKey.split("\n") : [];
    if (personSlugs.length === 0 && showSlugs.length === 0) {
      setItems([]);
      setTotal(0);
      setLoadedPage(page);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ person_slugs: personSlugs, show_slugs: showSlugs, page }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("favorites");
        return response.json() as Promise<FeedResponse>;
      })
      .then((body) => {
        if (cancelled) return;
        const nextTotal = typeof body.total === "number" ? body.total : 0;
        const clamped = clampListingPage(page, nextTotal, PUBLIC_LISTING_PAGE_SIZE);
        setItems(asItems(body.items));
        setTotal(nextTotal);
        setLoadedPage(clamped.page);
        setLoading(false);
        if (clamped.page !== page) {
          router.replace(listingPageHref(PATHNAME, clamped.page));
        }
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
        setTotal(0);
        setLoadedPage(page);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [library.ready, library.signedIn, personKey, showKey, page, router]);

  const signedOut = library.ready && !library.signedIn;
  const showGrid = library.signedIn && loadedPage === page && !loading;

  return (
    <div className="band">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="font-black m-0 leading-none" style={{ fontSize: "clamp(32px, 4vw, 44px)", letterSpacing: "-.025em" }}>
            Ulubione<span className="dot-accent">.</span>
          </h1>
          {signedOut && (
            <p className="mt-3 m-0 max-w-xl" style={{ color: "var(--paper-dim)", fontSize: "15px" }}>
              Zapisane w tej przeglądarce.{" "}
              <Link href={`/zaloguj?next=${PATHNAME}`} className="font-bold" style={{ color: "var(--coral)" }}>
                Zaloguj się
              </Link>
              , żeby mieć ulubione, obejrzane i listę „Do obejrzenia” też na innych urządzeniach.
            </p>
          )}
        </header>

        {!library.ready || (library.signedIn && !showGrid) ? (
          <p className="m-0 text-sm" style={{ color: "var(--paper-mute)" }}>Ładowanie…</p>
        ) : null}

        {showGrid && items.length === 0 && (
          <div className="text-center py-20" style={{ color: "var(--paper-mute)" }}>
            <p className="text-lg m-0">Brak treści dla wybranych ulubionych.</p>
            <div className="flex gap-4 justify-center mt-6">
              <Link href="/standuperzy" className="chip">Standuperzy</Link>
              <Link href="/formaty" className="chip">Formaty</Link>
            </div>
          </div>
        )}

        {showGrid && items.length > 0 && (
          <>
            <ItemsBrowser items={items} />
            <Pager
              page={page}
              total={total}
              pageSize={PUBLIC_LISTING_PAGE_SIZE}
              hrefForPage={(next) => listingPageHref(PATHNAME, next)}
            />
          </>
        )}
      </div>
    </div>
  );
}
