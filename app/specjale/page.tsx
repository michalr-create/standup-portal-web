import { getItemsByTagSlug } from "@/lib/data";
import FilterableItemsBrowser from "@/app/components/FilterableItemsBrowser";

export const revalidate = 120;

export default async function SpecjalePage() {
  const items = await getItemsByTagSlug("special", 100);

  return (
    <div className="band">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="font-black m-0 leading-none" style={{ fontSize: "clamp(32px, 4vw, 44px)", letterSpacing: "-.025em" }}>
            Specials<span className="dot-accent">.</span>
          </h1>
          <p className="mt-2" style={{ color: "var(--paper-dim)", fontSize: "17px" }}>
            {"Pe\u0142nometra\u017cowe programy stand-upowe."}
          </p>
        </header>
        <FilterableItemsBrowser items={items} countWord={{ one: "special", many: "specials" }} />
      </div>
    </div>
  );
}
