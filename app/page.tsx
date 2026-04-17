import Link from "next/link";
import {
  getRecentItems,
  getFeaturedItems,
  getItemsByTagSlug,
  getLatestPerShow,
} from "@/lib/data";
import type { Item, Show } from "@/lib/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "";
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "";
  try {
    return new Date(dateString).toLocaleDateString("pl-PL", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return "";
  }
}

function ItemCard({ item, size = "normal" }: { item: Item; size?: "normal" | "large" }) {
  const label = item.people.length > 0
    ? item.people.map((p) => p.name).join(" · ")
    : item.showName || "";

  return (
    <Link
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-neutral-900 rounded-lg overflow-hidden hover:bg-neutral-800 transition-colors"
    >
      {item.thumbnail_url ? (
        <div className={`${size === "large" ? "aspect-video" : "aspect-video"} bg-neutral-800 overflow-hidden relative`}>
          <img
            src={item.thumbnail_url}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
          {item.duration_seconds != null && (
            <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
              {formatDuration(item.duration_seconds)}
            </div>
          )}
        </div>
      ) : null}
      <div className="p-3">
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
          {item.categoryName && (
            <span className="px-1.5 py-0.5 bg-neutral-800 rounded text-gray-400">
              {item.categoryName}
            </span>
          )}
          <span>{formatDate(item.published_at)}</span>
        </div>
        <h3 className={`font-semibold leading-tight line-clamp-2 ${size === "large" ? "text-base" : "text-sm"}`}>
          {item.title}
        </h3>
        <p className="text-xs text-gray-500 mt-1 truncate">{label}</p>
      </div>
    </Link>
  );
}

function Section({
  title,
  linkHref,
  linkText,
  children,
}: {
  title: string;
  linkHref?: string;
  linkText?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">{title}</h2>
        {linkHref && (
          <Link href={linkHref} className="text-sm text-gray-400 hover:text-white">
            {linkText || "Zobacz wszystko"}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function ShowSection({ show, items }: { show: Show; items: Item[] }) {
  return (
    <div className="bg-neutral-900/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <Link href={`/format/${show.slug}`} className="font-semibold text-sm hover:text-gray-300">
          {show.name}
        </Link>
        <Link href={`/format/${show.slug}`} className="text-xs text-gray-500 hover:text-white">
          Wszystkie
        </Link>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            {item.thumbnail_url && (
              <div className="w-20 shrink-0 rounded overflow-hidden relative">
                <img src={item.thumbnail_url} alt="" className="w-full aspect-video object-cover" />
                {item.duration_seconds != null && (
                  <div className="absolute bottom-0.5 right-0.5 bg-black/80 text-white px-1 py-0.5 rounded" style={{ fontSize: "10px" }}>
                    {formatDuration(item.duration_seconds)}
                  </div>
                )}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium line-clamp-2">{item.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{formatDate(item.published_at)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default async function HomePage() {
  const [recentItems, featuredItems, specjalItems, showSections] = await Promise.all([
    getRecentItems(7, 3, 30),
    getFeaturedItems(6),
    getItemsByTagSlug("specjal", 6),
    getLatestPerShow(3),
  ]);

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 lg:py-10">
      <header className="mb-10">
        <h1 className="text-3xl lg:text-4xl font-bold mb-2">parska</h1>
        <p className="text-gray-400">polski stand-up w jednym miejscu</p>
      </header>

      {/* NOWOŚCI */}
      {recentItems.length > 0 && (
        <Section title="Nowosci">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {recentItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        </Section>
      )}

      {/* POLECANE */}
      {featuredItems.length > 0 && (
        <Section title="Polecane przez parsk\u0119">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredItems.map((item) => (
              <ItemCard key={item.id} item={item} size="large" />
            ))}
          </div>
        </Section>
      )}

      {/* SPECJALE */}
      {specjalItems.length > 0 && (
        <Section title="Specjale" linkHref="/standup" linkText="Wszystkie">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {specjalItems.map((item) => (
              <ItemCard key={item.id} item={item} size="large" />
            ))}
          </div>
        </Section>
      )}

      {/* FORMATY */}
      {showSections.length > 0 && (
        <Section title="Formaty" linkHref="/formaty" linkText="Wszystkie formaty">
          <div className="grid gap-6 sm:grid-cols-2">
            {showSections.map(({ show, items }) => (
              <ShowSection key={show.id} show={show} items={items} />
            ))}
          </div>
        </Section>
      )}

      <footer className="mt-16 pt-10 border-t border-neutral-800 text-center text-xs text-gray-500">
        Agregator tresci. Wszystkie prawa do materialow naleza do ich tworcow.
      </footer>
    </main>
  );
}
