import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getShowBySlug,
  getItemsByShowSlug,
  getShowHosts,
} from "@/lib/data";
import ItemsBrowser from "@/app/components/ItemsBrowser";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

type PlatformLinkProps = {
  href: string | null;
  label: string;
};

function PlatformLink({ href, label }: PlatformLinkProps) {
  if (!href) return null;
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs px-3 py-1 bg-neutral-800 hover:bg-neutral-700 rounded-full text-gray-300"
    >
      {label}
    </Link>
  );
}

export default async function ShowPage({ params }: Props) {
  const { slug } = await params;

  const show = await getShowBySlug(slug);
  if (!show) notFound();

  const [items, hosts] = await Promise.all([
    getItemsByShowSlug(slug),
    getShowHosts(show.id),
  ]);

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 lg:py-10">
      <header className="mb-8">
        {show.category_name && show.category_slug && (
          <Link
            href={`/${show.category_slug}`}
            className="text-xs text-gray-500 hover:text-white"
          >
            {show.category_name}
          </Link>
        )}
        <h1 className="text-3xl lg:text-4xl font-bold mt-1 mb-2">{show.name}</h1>
        {show.description && (
          <p className="text-gray-400 max-w-2xl mb-4">{show.description}</p>
        )}

        {hosts.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center mb-4">
            <span className="text-sm text-gray-500">Prowadzą:</span>
            {hosts.map((h) => (
              <Link
                key={h.id}
                href={`/standuper/${h.slug}`}
                className="text-sm text-white hover:text-gray-300 underline-offset-2 hover:underline"
              >
                {h.name}
              </Link>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <PlatformLink href={show.youtube_channel_url} label="▶ YouTube" />
          <PlatformLink href={show.spotify_show_url} label="♪ Spotify" />
          <PlatformLink href={show.apple_podcasts_url} label="♪ Apple Podcasts" />
          <PlatformLink href={show.website_url} label="🌐 Strona" />
        </div>
      </header>

      <ItemsBrowser items={items} showFilters={false} />
    </main>
  );
}
