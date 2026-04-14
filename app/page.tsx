import Nav from "@/app/components/Nav";
import ItemsBrowser from "@/app/components/ItemsBrowser";
import { getAllApprovedItems, getAllComedians } from "@/lib/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const [items, comedians] = await Promise.all([
    getAllApprovedItems(),
    getAllComedians(),
  ]);

  return (
    <>
      <Nav />
      <main className="max-w-6xl mx-auto px-4 pb-10">
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2">parska</h1>
          <p className="text-lg text-gray-400 mt-1">polski stand-up w jednym miejscu</p>
        </header>

        <ItemsBrowser items={items} comedians={comedians} />

        <footer className="mt-20 pt-10 border-t border-neutral-800 text-center text-xs text-gray-500">
          Agregator tresci. Wszystkie prawa do materialow naleza do ich tworcow.
        </footer>
      </main>
    </>
  );
}
