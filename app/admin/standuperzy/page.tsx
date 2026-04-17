import { getAllPeopleAdmin } from "../actions-sources";
import StanduperzyManager from "./StanduperzyManager";

export const dynamic = "force-dynamic";

export default async function StanduperzyPage() {
  const people = await getAllPeopleAdmin();

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-2">Standuperzy</h1>
      <p className="text-sm text-gray-400 mb-6">
        {people.length} {people.length === 1 ? "osoba" : "osob"} w bazie.
      </p>

      <StanduperzyManager people={people} />
    </div>
  );
}
