import { supabase, type ContentItem } from "@/lib/supabase";

export const revalidate = 300;

async function getApprovedItems(): Promise<ContentItem[]> {
  const { data, error } = await supabase
    .from("content_items")
    .select(`
      *,
      sources (
        name,
        comedian_id,
        comedians (
          name,
          slug
        )
      )
    `)
    .eq("status", "approved")
    .order("published_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Blad pobierania:", error);
    return [];
  }

  return (data || []) as ContentItem[];
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
            
              key={item.id}
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
                <div className="text-xs text-gray-500 mb-1">
                  {item.sources?.comedians?.name || item.sources?.name || ""}
                </div>
                <h2 className="font-semibold text-lg leading-tight mb-2 line-clamp-2">
                  {item.title}
                </h2>
                <div className="text-xs text-gray-500">
                  {formatDate(item.published_at)}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      <footer className="mt-20 pt-10 border-t border-neutral-800 text-center text-xs text-gray-500">
        Agregator tresci. Wszystkie prawa do materialow naleza do ich tworcow.
      </footer>
    </main>
  );
}
