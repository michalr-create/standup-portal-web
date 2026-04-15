import Link from "next/link";
import { getShowsByCategorySlug, getCategoryBySlug } from "@/lib/data";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function FormatyPage() {
  const [category, shows] = await Promise.all([
    getCategoryBySlug("formaty"),
    getShowsByCategorySlug("formaty"),
  ]);

  if (!category) notFound();

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 lg:py-10">
      <header className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold mb-2">{category.name}</h1>
        {category.description && (
          <p className="text-gray-400">{category.description}</p>
        )}
      </header>

      {shows.length === 0 ? (
        <div className="text-gray-400 text-center py-20">
          Brak formatów do pokazania. Wkrótce coś tu wpadnie.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shows.map((show) => (
            <Link
              key={show.id}
              href={`/format/${show.slug}`}
              className="group block bg-neutral-900 rounded-lg overflow-hidden hover:bg-neutral-800 transition-colors p-6"
            >
              <h2 className="font-semibold text-xl mb-2 group-hover:text-white">
                {show.name}
              </h2>
              {show.description && (
                <p className="text-sm text-gray-400 line-clamp-3">
                  {show.description}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
