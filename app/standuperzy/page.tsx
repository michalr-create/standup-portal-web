import { getAllPeople, getApprovedItemCountsByPersonId } from "@/lib/data";
import StanduperzyList from "@/app/components/StanduperzyList";

export const revalidate = 300;

export default async function StanduperzyPage() {
  const [people, counts] = await Promise.all([
    getAllPeople(),
    getApprovedItemCountsByPersonId(),
  ]);
  const directory = people.map((person) => ({
    id: person.id,
    name: person.name,
    slug: person.slug,
    itemCount: counts.get(person.id) ?? 0,
  }));

  return (
    <div className="band">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <div className="flex items-baseline gap-4 flex-wrap mb-2">
            <h1 className="font-black m-0 leading-none" style={{ fontSize: "clamp(32px, 4vw, 44px)", letterSpacing: "-.025em" }}>
              Standuperzy<span className="dot-accent">.</span>
            </h1>
            <span className="mono text-xs uppercase" style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}>
              {directory.length} {directory.length === 1 ? "osoba" : "os\u00f3b"} w bazie
            </span>
          </div>
        </header>
        <StanduperzyList people={directory} />
      </div>
    </div>
  );
}
