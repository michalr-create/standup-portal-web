import { getAllPeopleAdmin } from "../actions-sources";

export const dynamic = "force-dynamic";

export default async function StanduperzyPage() {
  const people = await getAllPeopleAdmin();

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-2">Standuperzy</h1>
      <p className="text-sm text-gray-400 mb-6">
        {people.length} {people.length === 1 ? "osoba" : "osob"} w bazie.
        Nowych standuperow mozesz dodawac tez ze strony Zrodla (przycisk &quot;+ Nowy standuper&quot;).
      </p>

      <div className="space-y-2">
        {people.map((p) => (
          <div
            key={p.id}
            className={`bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 flex items-center justify-between ${
              p.is_active ? "" : "opacity-50"
            }`}
          >
            <div>
              <span className="font-medium text-sm">{p.name}</span>
              <span className="text-xs text-gray-500 ml-2">/{p.slug}</span>
              {p.role && <span className="text-xs text-gray-500 ml-2">({p.role})</span>}
            </div>
            {!p.is_active && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-900 text-red-300">nieaktywny</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
