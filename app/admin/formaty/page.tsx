import { getAllShowsAdmin } from "../actions-sources";
import { getAllCategories } from "@/lib/data";
import FormatyManager from "./FormatyManager";

export const dynamic = "force-dynamic";

export default async function FormatyAdminPage() {
  const [shows, categories] = await Promise.all([
    getAllShowsAdmin(),
    getAllCategories(),
  ]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-2">Formaty</h1>
      <p className="text-sm text-gray-400 mb-6">
        {shows.length} {shows.length === 1 ? "format" : "formatow"} w bazie.
      </p>

      <FormatyManager shows={shows} categories={categories} />
    </div>
  );
}
