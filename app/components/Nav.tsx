import Link from "next/link";
import InstallButton from "./InstallButton";
import MobileMenu from "./MobileMenu";
import { getAllCategories, getAllPeople, getAllShows } from "@/lib/data";

export default async function Nav() {
  const [categories, people, shows] = await Promise.all([
    getAllCategories(),
    getAllPeople(),
    getAllShows(),
  ]);

  return (
    <nav className="lg:hidden border-b border-neutral-800 sticky top-0 z-40 bg-neutral-950">
      <div className="px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <MobileMenu
            categories={categories}
            people={people.map((p) => ({ id: p.id, name: p.name, slug: p.slug }))}
            shows={shows.map((s) => ({
              id: s.id,
              name: s.name,
              slug: s.slug,
              category_id: s.category_id,
            }))}
          />
          <Link href="/" className="font-bold text-xl">
            parska
          </Link>
        </div>
        <InstallButton />
      </div>
    </nav>
  );
}
