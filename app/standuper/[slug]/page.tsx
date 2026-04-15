import { notFound } from "next/navigation";
import {
  getPersonBySlug,
  getItemsByPersonSlug,
} from "@/lib/data";
import ItemsBrowser from "@/app/components/ItemsBrowser";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function StandupperPage({ params }: Props) {
  const { slug } = await params;

  const [person, items] = await Promise.all([
    getPersonBySlug(slug),
    getItemsByPersonSlug(slug),
  ]);

  if (!person) notFound();

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 lg:py-10">
      <header className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold mb-2">{person.name}</h1>
        {person.bio ? (
          <p className="text-gray-400 max-w-2xl">{person.bio}</p>
        ) : (
          <p className="text-gray-500 text-sm">
            {items.length === 1 ? "1 treść" : `${items.length} treści`}
          </p>
        )}
      </header>

      <ItemsBrowser items={items} showFilters={false} />
    </main>
  );
}
