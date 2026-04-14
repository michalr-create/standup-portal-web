import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Item = {
  id: number;
  title: string;
  url: string;
  thumbnail_url: string | null;
  published_at: string | null;
  source_id: number;
  sourceName: string;
  comedianName: string;
};

async function getApprovedItems(): Promise<Item[]> {
  const { data: items, error: itemsError } = await supabase
    .from("content_items")
    .select("id, title, url, thumbnail_url, published_at, source_id")
    .eq("status", "approved")
    .order("published_at", { ascending: false })
    .limit(50);

  if (itemsError || !items) {
    console.error("Blad pobierania items:", itemsError);
    return [];
  }

  const sourceIds = Array.from(new Set(items.map((i) => i.source_id)));

  const { data: sources, error: sourcesError } = await supabase
    .from("sources")
    .select("id, name, comedian_id")
    .in("id", sourceIds);

  if (sourcesError) {
    console.error("Blad pobierania sources:", sourcesError);
  }

  const comedianIds = Array.from(
    new Set(
      (sources || [])
        .map((s) => s.comedian_id)
        .filter((id): id is number => id !== null)
    )
  );

  const { data: comedians, error: comediansError } =
    comedianIds.length > 0
      ? await supabase
          .from("comedians")
          .select("id, name")
          .in("id", comedianIds)
      : { data: [], error: null };

  if (comediansError) {
    console.error("Blad pobierania comedians:", comediansError);
  }

  const sourcesMap = new Map((sources || []).map((s) => [s.id, s]));
  const comediansMap = new Map((comedians || []).map((c) => [c.id, c]));

  return items.map((item) => {
    const source = sourcesMap.get(item.source_id);
    const comedian = source?.comedian_id
      ? comediansMap.get(source.comedian_id)
      : null;

    return {
      id: item.id,
      title: item.title,
      url: item.url,
      thumbnail_url: item.thumbnail_url,
      published_at: item.published_at,
      source_id: item.source_id,
      sourceName: source?.name || "",
      comedianName: comedian?.name || source?.name || "",
    };
  });
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "";
  try {
    return new Date(dateString).toLocaleDateString("pl-PL", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function ItemCard({ item }: { item: Item }) {
  return (
    <Link
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-neutral-900 rounded-lg overflow-hidden hover:bg-neutral-800 transition-colors"
    >
      {item.thumbnail_url ? (
        <div className="aspect-video bg-neutral-800 overflow-hidden">
          <img
            src={item.thumbnail_url}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        </div>
      ) : null}
      <div className="p-4">
        <div className="text-xs text-gray-500 mb-1">{item.comedianName}</div>
        <h2 className="font-semibold text-lg leading-tight mb-2 line-clamp-2">
          {item.title}
        </h2>
        <div className="text-xs text-gray-500">
          {formatDate(item.published_at)}
        </div>
      </div>
    </Link>
  );
}

export default async function HomePage() {
  const items = await getApprovedItems();

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <header className="mb-10">
        <h1 className="text-4xl font-bold mb-2">Stand-up Portal</h1>
        <p className="text-gray-400">Nowosci z polskiej sceny stand-upowej</p>
      </header>

      {items.length === 0 ? (
        <div className="text-gray-400 text-center py-20">
          Brak zatwierdzonych tresci. Wroc za chwile.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}

      <footer className="mt-20 pt-10 border-t border-neutral-800 text-center text-xs text-gray-500">
        Agregator tresci. Wszystkie prawa do materialow naleza do ich tworcow.
      </footer>
    </main>
  );
}
