import Link from "next/link";
import RankingCards from "./RankingCards";
import { getHomeWeeklyHits } from "@/lib/rankings-data";

export default async function HomeWeeklyHits() {
  const preview = await getHomeWeeklyHits(5);
  if (!preview) return null;

  return (
    <section className="band">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between mb-5 md:mb-6 gap-6 flex-wrap">
          <div className="flex items-baseline gap-4 flex-wrap">
            <h2
              className="font-black m-0 leading-none"
              style={{ fontSize: "clamp(32px, 4vw, 44px)", letterSpacing: "-.025em" }}
            >
              Hity tygodnia<span className="dot-accent">.</span>
            </h2>
            <span className="mono text-xs uppercase" style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}>
              {preview.heading.replace(/^Hity tygodnia\s*/, "")}
            </span>
          </div>
          <Link
            href="/rankingi"
            className="mono text-xs uppercase pb-0.5 transition-colors hover:text-white"
            style={{ color: "var(--paper-dim)", letterSpacing: ".14em", borderBottom: "1px solid var(--line-2)" }}
          >
            {"Ca\u0142y ranking \u2192"}
          </Link>
        </div>
        <RankingCards entries={preview.entries} layout="strip" />
      </div>
    </section>
  );
}
