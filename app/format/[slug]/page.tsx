import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getShowBySlug, getShowEpisodesPage } from "@/lib/data";
import ItemsBrowser from "@/app/components/ItemsBrowser";
import HeartButton from "@/app/components/HeartButton";
import Pager from "@/app/components/Pager";
import {
  PUBLIC_LISTING_PAGE_SIZE,
  clampListingPage,
  listingPageHref,
  parseListingPage,
} from "@/lib/category-browse";
import { listingCountLabel } from "@/lib/listing-count";

export const revalidate = 120;

const ODCINEK = { one: "odcinek", few: "odcinki", many: "odcink\u00f3w" };

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
};

export default async function FormatPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const pathname = "/format/" + slug;
  const parsed = parseListingPage((await searchParams).page, pathname);
  if (parsed.redirectHref) redirect(parsed.redirectHref);

  const [show, episodes] = await Promise.all([
    getShowBySlug(slug),
    getShowEpisodesPage(slug, PUBLIC_LISTING_PAGE_SIZE, (parsed.page - 1) * PUBLIC_LISTING_PAGE_SIZE),
  ]);

  if (!show) notFound();

  const clamped = clampListingPage(parsed.page, episodes.total, PUBLIC_LISTING_PAGE_SIZE);
  if (clamped.page !== parsed.page) redirect(listingPageHref(pathname, clamped.page));

  return (
    <div className="band">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <h1 className="font-black m-0 leading-none" style={{ fontSize: "clamp(28px, 4vw, 40px)", letterSpacing: "-.025em" }}>
              {show.name}<span className="dot-accent">.</span>
            </h1>
            <HeartButton type="show" slug={slug} />
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
        <div className="mb-5 flex items-center justify-between gap-3">
          <span
            className="mono text-xs uppercase"
            style={{ color: "var(--paper-mute)", letterSpacing: ".16em", minWidth: 0, flex: "1 1 auto" }}
          >
            {listingCountLabel({
              catalogTotal: episodes.total,
              shown: episodes.items.length,
              inView: episodes.items.length,
              word: ODCINEK,
              filtered: false,
              server: true,
            })}
          </span>
        </div>
        <ItemsBrowser items={episodes.items} />
        <Pager
          page={parsed.page}
          total={episodes.total}
          pageSize={PUBLIC_LISTING_PAGE_SIZE}
          hrefForPage={(page) => listingPageHref(pathname, page)}
        />
      </div>
    </div>
  );
}
