import { getAllApprovedItems } from "@/lib/data";
import ItemsBrowser from "./components/ItemsBrowser";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const items = await getAllApprovedItems();

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 lg:py-10">
      <header className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold mb-2">Nowości</h1>
        <p className="text-gray-400">
          Najnowsze treści z polskiej sceny stand-upowej
        </p>
      </header>

      <ItemsBrowser items={items} />
    </main>
  );
}
