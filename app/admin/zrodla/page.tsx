import { getAllSourcesAdmin, toggleSourceActive, createSource } from "../actions-sources";
import { getAllPeople, getAllShows } from "@/lib/data";
import SourcesManager from "./SourcesManager";

export const dynamic = "force-dynamic";

export default async function ZrodlaPage() {
  const [sources, people, shows] = await Promise.all([
    getAllSourcesAdmin(),
    getAllPeople(),
    getAllShows(),
  ]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">Zrodla</h1>

      <SourcesManager
        sources={sources}
        people={people.map((p) => ({ id: p.id, name: p.name, slug: p.slug }))}
        shows={shows.map((s) => ({ id: s.id, name: s.name, slug: s.slug }))}
      />
    </div>
  );
}
