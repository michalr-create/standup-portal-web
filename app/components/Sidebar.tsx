import Link from "next/link";
import { getAllCategories, getAllPeople, getAllShows } from "@/lib/data";

export default async function Sidebar() {
  const [categories, people, shows] = await Promise.all([
    getAllCategories(),
    getAllPeople(),
    getAllShows(),
  ]);

  // Mapuj shows po category_id, żeby pokazać shows pod każdą kategorią
  const showsByCategory = new Map<number, typeof shows>();
  for (const show of shows) {
    if (!show.category_id) continue;
    if (!showsByCategory.has(show.category_id)) {
      showsByCategory.set(show.category_id, []);
    }
    showsByCategory.get(show.category_id)!.push(show);
  }

  return (
    <aside className="hidden lg:block w-64 shrink-0 border-r border-neutral-800 bg-neutral-950">
      <div className="sticky top-0 h-screen overflow-y-auto p-6">
        <Link href="/" className="block mb-8">
          <h1 className="text-2xl font-bold">parska</h1>
          <p className="text-xs text-gray-500 mt-1">polski stand-up</p>
        </Link>

        <nav className="space-y-6">
          <div>
            <Link
              href="/"
              className="text-sm font-medium text-gray-300 hover:text-white block mb-2"
            >
              Wszystko
            </Link>
          </div>

          {categories.map((cat) => {
            const categoryShows = showsByCategory.get(cat.id) || [];
            return (
              <div key={cat.id}>
                <Link
                  href={`/${cat.slug}`}
                  className="text-sm font-semibold text-white hover:text-gray-300 block mb-2"
                >
                  {cat.name}
                </Link>
                {cat.slug === "standup" && people.length > 0 && (
                  <ul className="ml-2 space-y-1 max-h-64 overflow-y-auto">
                    {people.map((p) => (
                      <li key={p.id}>
                        <Link
                          href={`/standuper/${p.slug}`}
                          className="text-xs text-gray-400 hover:text-white block py-0.5"
                        >
                          {p.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {cat.slug !== "standup" && categoryShows.length > 0 && (
                  <ul className="ml-2 space-y-1">
                    {categoryShows.map((s) => (
                      <li key={s.id}>
                        <Link
                          href={`/format/${s.slug}`}
                          className="text-xs text-gray-400 hover:text-white block py-0.5"
                        >
                          {s.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>

        <div className="mt-10 pt-6 border-t border-neutral-800 text-xs text-gray-500">
          <p>Agregator polskiego stand-upu</p>
        </div>
      </div>
    </aside>
  );
}
