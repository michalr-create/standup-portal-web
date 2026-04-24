import Link from "next/link";
import { getShowBySlug, getItemsByShowSlug } from "@/lib/data";
import ItemsBrowser from "@/app/components/ItemsBrowser";
import HeartButton from "@/app/components/HeartButton";
import { notFound } from "next/navigation";

export const revalidate = 120;

function odcinekLabel(n: number): string {
  if (n === 1) return "odcinek";
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 > 20)) return "odcinki";
  return "odcink\u00f3w";
}

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function FormatPage({ params }: Props) {
  const { slug } = await params;
  const [show, items] = await Promise.all([
    getShowBySlug(slug),
    getItemsByShowSlug(slug, 999),
  ]);

  if (!show) notFound();

  return (
    <div className="band">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <h1 className="font-black m-0 leading-none" style={{ fontSize: "clamp(28px, 4vw, 40px)", letterSpacing: "-.025em" }}>
              {show.name}<span className="dot-accent">.</span>
            </h1>
            <HeartButton type="show" slug={slug} />
            <span className="mono text-xs uppercase" style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}>
              {items.length} {odcinekLabel(items.length)}
            </span>
          </div>
          {show.description && (
            <p className="max-w-2xl" style={{ color: "var(--paper-dim)", fontSize: "17px", lineHeight: "1.55" }}>
              {show.description}
            </p>
          )}
          <div className="flex gap-3 mt-4 flex-wrap">
            {show.youtube_channel_url && (
              <Link href={show.youtube_channel_url} target="_blank" rel="noopener noreferrer" className="chip">
                YouTube
              </Link>
            )}
            {show.spotify_show_url && (
              <Link href={show.spotify_show_url} target="_blank" rel="noopener noreferrer" className="chip">
                Spotify
              </Link>
            )}
            {show.apple_podcasts_url && (
              <Link href={show.apple_podcasts_url} target="_blank" rel="noopener noreferrer" className="chip">
                Apple Podcasts
              </Link>
            )}
            {show.website_url && (
              <Link href={show.website_url} target="_blank" rel="noopener noreferrer" className="chip">
                Strona
              </Link>
            )}
          </div>
        </header>
        <ItemsBrowser items={items} />
      </div>
    </div>
  );
}
