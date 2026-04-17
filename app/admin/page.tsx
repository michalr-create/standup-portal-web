import Link from "next/link";
import { getPendingItems } from "./actions";
import ModerationCard from "./components/ModerationCard";
import { getAllCategories, getAllShows } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const [pendingData, allCategories, allShows] = await Promise.all([
    getPendingItems(),
    getAllCategories(),
    getAllShows(),
  ]);

  const { items, personTags } = pendingData;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Moderacja</h1>
          <p className="text-sm text-gray-400">
            {items.length === 0
              ? "Brak wpisow do moderacji"
              : `${items.length} ${items.length === 1 ? "wpis czeka" : "wpisow czeka"} na moderacje`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/standuperzy"
            className="text-xs px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded text-gray-300"
          >
            Standuperzy
          </Link>
          <Link
            href="/admin/formaty"
            className="text-xs px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded text-gray-300"
          >
            Formaty
          </Link>
          <Link
            href="/admin/zrodla"
            className="text-xs px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded text-gray-300"
          >
            Zrodla
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <div className="text-4xl mb-4">🎉</div>
          <p>Wszystko moderowane. Wracaj pozniej!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <ModerationCard
              key={item.id}
              item={item}
              personTags={personTags}
              categories={allCategories}
              shows={allShows.map((s) => ({ id: s.id, name: s.name, slug: s.slug }))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
