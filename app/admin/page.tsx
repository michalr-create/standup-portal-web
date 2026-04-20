import Link from "next/link";
import { Suspense } from "react";
import { getPendingItems, getItemsByStatus, getFeaturedItems } from "./actions";
import ModerationList from "./components/ModerationList";
import StatusTabs from "./components/StatusTabs";
import AddEntryButton from "./components/AddEntryButton";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminHomePage({ searchParams }: Props) {
  const params = await searchParams;
  const currentStatus = params.status || "pending";

  // Pobierz dane dla aktualnej zakladki
  let data;
  if (currentStatus === "pending") {
    data = await getPendingItems();
  } else if (currentStatus === "featured") {
    data = await getFeaturedItems();
  } else {
    data = await getItemsByStatus(currentStatus);
  }

  const { items, personTags, contentTags, allCategories, allShows } = data;

  // Policz wpisy w kazdym statusie
  const pendingData = currentStatus === "pending" ? data : await getItemsByStatus("pending");
  const approvedData = currentStatus === "approved" ? data : await getItemsByStatus("approved");
  const rejectedData = currentStatus === "rejected" ? data : await getItemsByStatus("rejected");
  const featuredData = currentStatus === "featured" ? data : await getFeaturedItems();

  const counts = {
    pending: pendingData.items.length,
    approved: approvedData.items.length,
    rejected: rejectedData.items.length,
    featured: featuredData.items.length,
  };

  // Dla zakladki featured pokazujemy tryb "approved" (bo to zatwierdzone + wyróżnione)
  const displayMode = currentStatus === "featured" ? "approved" : currentStatus;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Moderacja</h1>
        <div className="flex gap-2">
          <AddEntryButton
            categories={allCategories}
            shows={allShows}
            personTags={personTags}
          />
          <Link href="/admin/standuperzy" className="text-xs px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded text-gray-300">Standuperzy</Link>
          <Link href="/admin/formaty" className="text-xs px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded text-gray-300">Formaty</Link>
          <Link href="/admin/zrodla" className="text-xs px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded text-gray-300">Zrodla</Link>
        </div>
      </div>

      <Suspense fallback={null}>
        <StatusTabs counts={counts} />
      </Suspense>

      <ModerationList
        items={items}
        personTags={personTags}
        contentTags={contentTags || []}
        categories={allCategories}
        shows={allShows}
        mode={displayMode as "pending" | "approved" | "rejected"}
        emptyIcon={currentStatus === "pending" ? "\ud83c\udf89" : currentStatus === "featured" ? "\u2b50" : "\ud83d\udced"}
        emptyMessage={
          currentStatus === "pending"
            ? "Wszystko moderowane. Wracaj pozniej!"
            : currentStatus === "featured"
            ? "Brak wyroznonych wpisow. Wyroznij cos w zakladce Zatwierdzone."
            : currentStatus === "approved"
            ? "Brak zatwierdzonych wpisow."
            : "Brak odrzuconych wpisow."
        }
      />
    </div>
  );
}
