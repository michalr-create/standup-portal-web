import { getLatestPerShow } from "@/lib/data";
import FormatCard from "@/app/components/FormatCard";
import { DEFAULT_GRID_CLASS } from "@/app/components/itemsBrowserLayout";

export const revalidate = 120;

export default async function FormatyPage() {
  const shows = await getLatestPerShow(1);

  return (
    <div className="band">
      <div className="max-w-6xl mx-auto">
        <header className="mb-4 md:mb-8">
          <div className="flex items-baseline gap-4 flex-wrap">
            <h1 className="font-black m-0 leading-none" style={{ fontSize: "clamp(32px, 4vw, 44px)", letterSpacing: "-.025em" }}>
              Formaty<span className="dot-accent">.</span>
            </h1>
            <span className="mono text-xs uppercase" style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}>
              Cykliczne programy
            </span>
          </div>
        </header>
        {shows.length === 0 ? (
          <p style={{ color: "var(--paper-mute)" }}>Brak formatów z odcinkami.</p>
        ) : (
          <div className={DEFAULT_GRID_CLASS}>
            {shows.map(({ show, totalCount, latestDate, items }) => (
              <FormatCard
                key={show.id}
                name={show.name}
                slug={show.slug}
                thumbnailUrl={items[0]?.thumbnail_url ?? null}
                durationSeconds={items[0]?.duration_seconds ?? null}
                totalCount={totalCount}
                latestDate={latestDate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
