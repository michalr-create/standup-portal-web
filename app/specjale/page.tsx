import { getItemsByTagSlug } from "@/lib/data";
import ItemsBrowser from "@/app/components/ItemsBrowser";

export const dynamic = "force-dynamic";

export default async function SpecjalePage() {
  const items = await getItemsByTagSlug("specjal", 100);

  return (
    <div className="band">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <div className="flex items-baseline gap-4 flex-wrap mb-2">
            <h1 className="font-black m-0 leading-none" style={{ fontSize: "clamp(32px, 4vw, 44px)", letterSpacing: "-.025em" }}>
              Specjale<span className="dot-accent">.</span>
            </h1>
            <span className="mono text-xs uppercase" style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}>
              {items.length} {items.length === 1 ? "pozycja" : "pozycji"}
            </span>
          </div>
          <p style={{ color: "var(--paper-dim)", fontSize: "17px" }}>
            {"Pe\u0142nometra\u017cowe programy stand-upowe."}
          </p>
        </header>
        <ItemsBrowser items={items} />
      </div>
    </div>
  );
}
