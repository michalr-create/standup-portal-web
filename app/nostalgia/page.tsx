import type { Metadata } from "next";
import { cookies } from "next/headers";
import RankingCards from "@/app/components/RankingCards";
import { getNostalgiaPage } from "@/lib/nostalgia-data";
import { NOSTALGIA_COOKIE, parseNostalgiaCookie } from "@/lib/nostalgia";
import NostalgiaReroll from "./NostalgiaReroll";

export const metadata: Metadata = {
  title: "Nostalgia \u2014 parska.",
  description: "Losowa p\u00f3\u0142ka specjali starszych ni\u017c pi\u0119\u0107 lat i nostalgiczne hity.",
};

export default async function NostalgiaPage() {
  const jar = await cookies();
  const excludeIds = parseNostalgiaCookie(jar.get(NOSTALGIA_COOKIE)?.value);
  const { shelf, hits } = await getNostalgiaPage(excludeIds);

  return (
    <div className="band">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1
              className="font-black m-0 leading-none"
              style={{ fontSize: "clamp(32px, 4vw, 44px)", letterSpacing: "-.025em" }}
            >
              Nostalgia<span className="dot-accent">.</span>
            </h1>
            <p className="mt-3 max-w-2xl" style={{ color: "var(--paper-dim)", fontSize: "17px" }}>
              {"Losowa p\u00f3\u0142ka 12 specjali starszych ni\u017c 5 lat, trwaj\u0105cych co najmniej 30 minut. Od\u015bwie\u017cenie losuje nast\u0119pn\u0105, bez powt\u00f3rki poprzedniej."}
            </p>
          </div>
          <NostalgiaReroll ids={shelf.map((entry) => entry.item.id)} />
        </header>

        {shelf.length === 0 ? (
          <p className="py-16 text-center" style={{ color: "var(--paper-mute)" }}>
            {"Nie ma jeszcze specjali starszych ni\u017c 5 lat z pe\u0142nym nagraniem."}
          </p>
        ) : (
          <RankingCards entries={shelf} showCategoryBadge={false} />
        )}

        <section className="mt-14">
          <h2
            className="font-black m-0 mb-6 leading-none"
            style={{ fontSize: "clamp(26px, 3vw, 36px)", letterSpacing: "-.025em" }}
          >
            {"Nostalgiczne hity"}
            <span className="dot-accent">.</span>
          </h2>
          {hits.length === 0 ? (
            <p style={{ color: "var(--paper-mute)" }}>{"Brak wy\u015bwietle\u0144 w tej puli."}</p>
          ) : (
            <RankingCards entries={hits} showCategoryBadge={false} />
          )}
        </section>
      </div>
    </div>
  );
}
