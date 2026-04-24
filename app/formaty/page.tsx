import Link from "next/link";
import { getAllShows, getItemsByShowSlug } from "@/lib/data";
import type { Show } from "@/lib/data";

export const revalidate = 120;

function odcinekLabel(n: number): string {
  if (n === 1) return "odcinek";
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 > 20)) return "odcinki";
  return "odcink\u00f3w";
}

function ShowCard({ show, itemCount }: { show: Show; itemCount: number }) {
  return (
    <Link href={"/format/" + show.slug} className="fcard group">
      <div className="w-12 h-12 rounded-xl grid place-items-center font-black mono text-lg" style={{ background: "var(--ink)", color: "var(--paper)" }}>
        {show.name.charAt(0)}
      </div>
      <h4 className="font-black m-0 leading-tight" style={{ fontSize: "20px", letterSpacing: "-.01em", color: "var(--ink)" }}>
        {show.name}
      </h4>
      {show.description && (
        <p className="m-0 leading-relaxed line-clamp-3" style={{ fontSize: "13.5px", color: "#4a453c" }}>
          {show.description}
        </p>
      )}
      <div className="mt-auto mono text-xs uppercase flex justify-between items-center" style={{ color: "#7a7466", letterSpacing: ".14em" }}>
        <span>{itemCount} {odcinekLabel(itemCount)}</span>
        <span className="w-7 h-7 rounded-full grid place-items-center text-sm" style={{ background: "var(--ink)", color: "var(--paper)" }}>
          {"\u2192"}
        </span>
      </div>
    </Link>
  );
}

export default async function FormatyPage() {
  const shows = await getAllShows();

  const showsWithCounts = await Promise.all(
    shows.map(async (show) => {
      const items = await getItemsByShowSlug(show.slug, 999);
      return { show, itemCount: items.length };
    })
  );

  return (
    <div className="band band-light">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <div className="flex items-baseline gap-4 flex-wrap mb-2">
            <h1 className="font-black m-0 leading-none" style={{ fontSize: "clamp(32px, 4vw, 44px)", letterSpacing: "-.025em", color: "var(--ink)" }}>
              Formaty<span className="dot-accent">.</span>
            </h1>
            <span className="mono text-xs uppercase" style={{ color: "#555", letterSpacing: ".16em" }}>
              Cykliczne programy
            </span>
          </div>
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {showsWithCounts.map(({ show, itemCount }) => (
            <ShowCard key={show.id} show={show} itemCount={itemCount} />
          ))}
        </div>
      </div>
    </div>
  );
}
