import Link from "next/link";
import { Suspense } from "react";
import { getPendingItems, getItemsByStatus, getFeaturedItems, getStatusCounts } from "./actions";
import ModerationList from "./components/ModerationList";
import StatusTabs from "./components/StatusTabs";
import AddEntryButton from "./components/AddEntryButton";
import AdminSearchBar from "./components/AdminSearchBar";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type Props = {
  searchParams: Promise<{ status?: string; q?: string; page?: string; cat?: string }>;
};

export default async function AdminHomePage({ searchParams }: Props) {
  const params = await searchParams;
  const currentStatus = params.status || "pending";
  const search = params.q || "";
  const page = Math.max(0, parseInt(params.page || "0", 10));
  const categoryId = params.cat ? parseInt(params.cat, 10) : null;

  const [data, counts] = await Promise.all([
    currentStatus === "pending"
      ? getPendingItems(search, page)
      : currentStatus === "featured"
      ? getFeaturedItems(search, page)
      : getItemsByStatus(currentStatus, search, page, categoryId),
    getStatusCounts(),
  ]);

  const { items, totalCount, personTags, contentTags, allCategories, allShows } = data as typeof data & { totalCount: number };

  const displayMode = currentStatus === "featured" ? "approved" : currentStatus;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const buildUrl = (overrides: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    p.set("status", currentStatus);
    if (search) p.set("q", search);
    if (page > 0) p.set("page", String(page));
    if (categoryId != null) p.set("cat", String(categoryId));
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined || v === "") p.delete(k);
      else p.set(k, String(v));
    }
    return `/admin?${p.toString()}`;
  };

  const buildCatUrl = (catId: number | null) => {
    const p = new URLSearchParams();
    p.set("status", currentStatus);
    if (search) p.set("q", search);
    if (catId != null) p.set("cat", String(catId));
    return `/admin?${p.toString()}`;
  };

  const emptyIcon = currentStatus === "pending" ? "\ud83c\udf89" : currentStatus === "featured" ? "\u2b50" : "\ud83d\udced";
  const emptyMessage =
    currentStatus === "pending"
      ? "Wszystko moderowane. Wracaj pozniej!"
      : currentStatus === "featured"
      ? "Brak wyroznonych wpisow."
      : currentStatus === "approved"
      ? "Brak zatwierdzonych wpisow."
      : "Brak odrzuconych wpisow.";

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Moderacja</h1>
        <div className="flex gap-2">
          <AddEntryButton categories={allCategories} shows={allShows} personTags={personTags} />
          <Link href="/admin/standuperzy" className="text-xs px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded text-gray-300">Standuperzy</Link>
          <Link href="/admin/formaty" className="text-xs px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded text-gray-300">Formaty</Link>
          <Link href="/admin/zrodla" className="text-xs px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded text-gray-300">Zrodla</Link>
          <Link href="/admin/tagi" className="text-xs px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded text-gray-300">Tagi</Link>
        </div>
      </div>

      <Suspense fallback={null}>
        <StatusTabs counts={counts} />
      </Suspense>

      <AdminSearchBar defaultValue={search} currentStatus={currentStatus} />

      {(currentStatus === "approved" || currentStatus === "rejected") && allCategories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <Link
            href={buildCatUrl(null)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${categoryId == null ? "bg-white text-black border-white" : "bg-transparent text-gray-400 border-neutral-700 hover:border-neutral-500"}`}
          >
            Wszystkie
          </Link>
          {allCategories.map((c) => (
            <Link
              key={c.id}
              href={buildCatUrl(c.id)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${categoryId === c.id ? "bg-white text-black border-white" : "bg-transparent text-gray-400 border-neutral-700 hover:border-neutral-500"}`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}

      {totalCount > 0 && (
        <div className="flex items-center justify-between mb-4 text-xs text-gray-500">
          <span>
            {search ? `${totalCount} wynik\u00f3w dla \u201e${search}\u201d` : `${totalCount} pozycji`}
            {totalPages > 1 && ` \u2014 strona ${page + 1} z ${totalPages}`}
          </span>
          {totalPages > 1 && (
            <div className="flex gap-2">
              {page > 0 && (
                <Link href={buildUrl({ page: page - 1 })} className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-gray-300">
                  \u2190 Poprzednia
                </Link>
              )}
              {page + 1 < totalPages && (
                <Link href={buildUrl({ page: page + 1 })} className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-gray-300">
                  Nast\u0119pna \u2192
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      <ModerationList
        items={items}
        personTags={personTags}
        contentTags={contentTags || []}
        categories={allCategories}
        shows={allShows}
        mode={displayMode as "pending" | "approved" | "rejected"}
        emptyIcon={emptyIcon}
        emptyMessage={emptyMessage}
      />

      {totalPages > 1 && items.length > 0 && (
        <div className="flex justify-center gap-2 mt-6">
          {page > 0 && (
            <Link href={buildUrl({ page: page - 1 })} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded text-gray-300 text-sm">
              \u2190 Poprzednia
            </Link>
          )}
          <span className="px-4 py-2 text-sm text-gray-500">{page + 1} / {totalPages}</span>
          {page + 1 < totalPages && (
            <Link href={buildUrl({ page: page + 1 })} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded text-gray-300 text-sm">
              Nast\u0119pna \u2192
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
