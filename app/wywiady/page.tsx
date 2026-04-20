import { getItemsByCategorySlug, getCategoryBySlug } from "@/lib/data";
import ItemsBrowser from "@/app/components/ItemsBrowser";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

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
          <div className="flex items-baseline gap-4 flex-wrap mb-2">
            <h1 className="font-black m-0 leading-none" style={{ fontSize: "clamp(32px, 4vw, 44px)", letterSpacing: "-.025em" }}>
              Wywiady<span className="dot-accent">.</span>
            </h1>
            <span className="mono text-xs uppercase" style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}>
              {items.length} {items.length === 1 ? "rozmowa" : "rozm\u00f3w"}
            </span>
          </div>
          {category.description && (
            <p style={{ color: "var(--paper-dim)", fontSize: "17px" }}>{category.description}</p>
          )}
        </header>
        <ItemsBrowser items={items} />
      </div>
    </div>
  );
}
