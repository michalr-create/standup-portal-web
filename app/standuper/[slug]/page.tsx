import { getPersonBySlug, getItemsByPersonSlug } from "@/lib/data";
import ItemsBrowser from "@/app/components/ItemsBrowser";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function StanduperPage({ params }: Props) {
  const { slug } = await params;
  const [person, items] = await Promise.all([
    getPersonBySlug(slug),
    getItemsByPersonSlug(slug),
  ]);

  if (!person) notFound();

  return (
    <div className="band">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <div className="mono text-xs uppercase mb-3" style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}>
            {person.role || "Standuper"}
          </div>
          <div className="flex items-baseline gap-4 flex-wrap mb-2">
            <h1 className="font-black m-0 leading-none" style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-.025em" }}>
              {person.name}<span className="dot-accent">.</span>
            </h1>
            <span className="mono text-xs uppercase" style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}>
              {items.length} {items.length === 1 ? "materia\u0142" : "materia\u0142\u00f3w"}
            </span>
          </div>
          {person.bio && (
            <p className="max-w-2xl" style={{ color: "var(--paper-dim)", fontSize: "17px", lineHeight: "1.55" }}>
              {person.bio}
            </p>
          )}
        </header>
        <ItemsBrowser items={items} />
      </div>
    </div>
  );
}
