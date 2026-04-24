import { getAllPeople } from "@/lib/data";
import StanduperzyList from "@/app/components/StanduperzyList";

export const revalidate = 300;

export default async function StanduperzyPage() {
  const people = await getAllPeople();

  return (
    <div className="band">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <div className="flex items-baseline gap-4 flex-wrap mb-2">
            <h1 className="font-black m-0 leading-none" style={{ fontSize: "clamp(32px, 4vw, 44px)", letterSpacing: "-.025em" }}>
              Standuperzy<span className="dot-accent">.</span>
            </h1>
            <span className="mono text-xs uppercase" style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}>
              {people.length} {people.length === 1 ? "osoba" : "os\u00f3b"} w bazie
            </span>
          </div>
        </header>
        <StanduperzyList people={people} />
      </div>
    </div>
  );
}
