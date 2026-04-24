import { getItemsByCategorySlug, getCategoryBySlug } from "@/lib/data";
import FilterableItemsBrowser from "@/app/components/FilterableItemsBrowser";
import { notFound } from "next/navigation";

export const revalidate = 120;

export default async function WywiadyPage() {
  const [category, items] = await Promise.all([
    getCategoryBySlug("wywiady"),
    getItemsByCategorySlug("wywiady"),
  ]);

  if (!category) notFound();

  return (
    <div className="band">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="font-black m-0 leading-none" style={{ fontSize: "clamp(32px, 4vw, 44px)", letterSpacing: "-.025em" }}>
            Wywiady<span className="dot-accent">.</span>
          </h1>
          {category.description && (
            <p className="mt-2" style={{ color: "var(--paper-dim)", fontSize: "17px" }}>{category.description}</p>
          )}
        </header>
        <FilterableItemsBrowser items={items} countWord={{ one: "rozmowa", many: "rozm\u00f3w" }} />
      </div>
    </div>
  );
}
