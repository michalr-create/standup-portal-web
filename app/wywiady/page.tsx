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
    <main className="max-w-6xl mx-auto px-4 py-8 lg:py-10">
      <header className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold mb-2">{category.name}</h1>
        {category.description && (
          <p className="text-gray-400">{category.description}</p>
        )}
      </header>

      <ItemsBrowser items={items} />
    </main>
  );
}
