import { getItemsByCategorySlug, getCategoryBySlug } from "@/lib/data";
import FilterableItemsBrowser from "@/app/components/FilterableItemsBrowser";
import { notFound } from "next/navigation";

export const revalidate = 120;

export default async function ShortsPage() {
  const [category, items] = await Promise.all([
    getCategoryBySlug("shorts"),
    getItemsByCategorySlug("shorts"),
  ]);

  if (!category) notFound();

  return (
    <div className="band">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="font-black m-0 leading-none" style={{ fontSize: "clamp(32px, 4vw, 44px)", letterSpacing: "-.025em" }}>
            Shorts<span className="dot-accent">.</span>
          </h1>
          {category.description && (
            <p className="mt-2" style={{ color: "var(--paper-dim)", fontSize: "17px" }}>{category.description}</p>
          )}
        </header>
        <FilterableItemsBrowser items={items} countWord={{ one: "kr\u00f3tki klip", many: "kr\u00f3tkich klip\u00f3w" }} />
      </div>
    </div>
  );
}
