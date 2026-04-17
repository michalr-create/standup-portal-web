import Link from "next/link";
import { Suspense } from "react";
import { getPendingItems, getItemsByStatus } from "./actions";
import ModerationCard from "./components/ModerationCard";
import StatusTabs from "./components/StatusTabs";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminHomePage({ searchParams }: Props) {
  const params = await searchParams;
  const currentStatus = params.status || "pending";

  // Pobierz dane dla aktualnej zakładki
  const data = currentStatus === "pending"
    ? await getPendingItems()
    : await getItemsByStatus(currentStatus);

  const { items, personTags, allCategories, allShows } = data;

  // Policz wpisy w kazdym statusie (do zakładek)
  const pendingData = currentStatus === "pending" ? data : await getItemsByStatus("pending");
  const approvedData = currentStatus === "approved" ? data : await getItemsByStatus("approved");
  const rejectedData = currentStatus === "rejected" ? data : await getItemsByStatus("rejected");

  const counts = {
    pending: pendingData.items.length,
    approved: approvedData.items.length,
    rejected: rejectedData.items.length,
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Moderacja</h1>
        <div className="flex gap-2">
          <Link href="/admin/standuperzy" className="text-xs px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded text-gray-300">Standuperzy</Link>
          <Link href="/admin/formaty" className="text-xs px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded text-gray-300">Formaty</Link>
          <Link href="/admin/zrodla" className="text-xs px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded text-gray-300">Zrodla</Link>
        </div>
      </div>

      <Suspense fallback={null}>
        <StatusTabs counts={counts} />
      </Suspense>

      {items.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <div className="text-4xl mb-4">{currentStatus === "pending" ? "🎉" : "📭"}</div>
          <p>
            {currentStatus === "pending"
              ? "Wszystko moderowane. Wracaj pozniej!"
              : currentStatus === "approved"
              ? "Brak zatwierdzonych wpisow."
              : "Brak odrzuconych wpisow."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <ModerationCard
              key={item.id}
              item={item}
              personTags={personTags}
              categories={allCategories}
              shows={allShows}
              mode={currentStatus as "pending" | "approved" | "rejected"}
            />
          ))}
        </div>
      )}
    </div>
  );
}
