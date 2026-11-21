import RankingCards from "./RankingCards";
import SectionHead from "./SectionHead";
import { getHomeRanking } from "@/lib/rankings-data";
import { currentUtcYear, rankingHref } from "@/lib/rankings";

export default async function HomeRankings() {
  const preview = await getHomeRanking();

  return (
    <section className="band">
      <div className="max-w-6xl mx-auto">
        <SectionHead
          title="Rankingi"
          sub={preview.label}
          linkHref={rankingHref({ ranking: preview.kind }, currentUtcYear())}
          linkText={"Zobacz wszystkie \u2192"}
        />
        {preview.entries.length > 0 ? (
          <RankingCards entries={preview.entries} layout="strip" />
        ) : (
          <p className="py-8 text-center" style={{ color: "var(--paper-mute)" }}>
            {"Brak pozycji w tym zestawieniu."}
          </p>
        )}
      </div>
    </section>
  );
}
