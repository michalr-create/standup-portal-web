import type { Metadata } from "next";
import RankingCards from "@/app/components/RankingCards";
import { getNostalgiaPage } from "@/lib/nostalgia-data";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Nostalgia \u2014 parska.",
  description: "P\u00f3\u0142ka dnia: specjale starsze ni\u017c pi\u0119\u0107 lat i nostalgiczne hity.",
};

export default async function NostalgiaPage() {
  const { shelf, hits } = await getNostalgiaPage();

  return (
    <div className="band">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1
            className="font-black m-0 leading-none"
            style={{ fontSize: "clamp(32px, 4vw, 44px)", letterSpacing: "-.025em" }}
          >
            Nostalgia<span className="dot-accent">.</span>
          </h1>
          <p className="mt-3 max-w-2xl" style={{ color: "var(--paper-dim)", fontSize: "17px" }}>
            {"P\u00f3\u0142ka dnia: 12 specjali starszych ni\u017c 5 lat, trwaj\u0105cych co najmniej 30 minut. Ta sama kolejno\u015b\u0107 co na stronie g\u0142\u00f3wnej. Nowa lista o p\u00f3\u0142nocy czasu warszawskiego."}
          </p>
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
