import { notFound } from "next/navigation";
import Nav from "@/app/components/Nav";
import ItemsBrowser from "@/app/components/ItemsBrowser";
import {
  getComedianBySlug,
  getItemsByComedianSlug,
  getAllComedians,
} from "@/lib/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function ComedianPage({ params }: Props) {
  const { slug } = await params;

  const [comedian, items, allComedians] = await Promise.all([
    getComedianBySlug(slug),
    getItemsByComedianSlug(slug),
    getAllComedians(),
  ]);

  if (!comedian) {
    notFound();
  }

  return (
    <>
      <Nav />
      <main className="max-w-6xl mx-auto px-4 pb-10">
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{comedian.name}</h1>
          <p className="text-gray-400">
            {items.length}{" "}
            {items.length === 1 ? "tresc" : items.length < 5 ? "tresci" : "tresci"}
          </p>
        </header>

        <ItemsBrowser items={items} comedians={allComedians} showFilters={false} />

        <footer className="mt-20 pt-10 border-t border-neutral-800 text-center text-xs text-gray-500">
          Agregator tresci. Wszystkie prawa do materialow naleza do ich tworcow.
        </footer>
      </main>
    </>
  );
}
