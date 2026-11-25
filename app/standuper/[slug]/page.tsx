import type { Metadata } from "next";
import { getPersonBySlug, getItemsByPersonSlug, getDefaultShowsForPerson, countUpcomingEventsForPerson, getPersonYouTubeUrls } from "@/lib/data";
import { contentMetadata } from "@/lib/seo";
import JsonLd from "@/app/components/JsonLd";
import { personPageGraph } from "@/lib/jsonld";
import FormatCard from "@/app/components/FormatCard";
import ScrollRow from "@/app/components/ScrollRow";
import SectionHead from "@/app/components/SectionHead";
import HeartButton from "@/app/components/HeartButton";
import { categoryBrowseHref } from "@/lib/category-browse";
import { buildProfileBlocks, profileCountLabel, profileVideoCount } from "@/lib/standuper-profile";
import { notFound, permanentRedirect } from "next/navigation";
import { portraitJsonLd, profileSameAs, resolvePersonPortrait } from "@/lib/person-portrait";
import { personAliasTarget } from "@/lib/slug-alias-lookup";
import { slugRedirectPath } from "@/lib/slug-redirect";
import ProfilePortrait, { ProfilePortraitCredit } from "./ProfilePortrait";
import ProfileTour from "./ProfileTour";

export const revalidate = 120;

type Props = {
  params: Promise<{ slug: string }>;
};

async function redirectLegacyPerson(slug: string): Promise<void> {
  const path = slugRedirectPath("standuper", slug, await personAliasTarget(slug));
  if (path) permanentRedirect(path);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const person = await getPersonBySlug(slug);
  if (!person) {
    await redirectLegacyPerson(slug);
    notFound();
  }
  const portrait = resolvePersonPortrait(person);
  return contentMetadata({
    title: `${person.name} \u2014 stand-up, nagrania i wyst\u0119py`,
    description: person.bio,
    fallbackDescription: `Nagrania, specjale, formaty i nadchodz\u0105ce wyst\u0119py: ${person.name} w polskim stand-upie.`,
    pathname: `/standuper/${person.slug}`,
    openGraphType: "profile",
    image: portrait?.ogImage ?? null,
  });
}

export default async function StanduperPage({ params }: Props) {
  const { slug } = await params;
  const now = new Date();
  // One person read. Rows keep PROFILE_ROW_LIMIT cards; the rest is a count plus a listing link.
  const personPromise = getPersonBySlug(slug);
  const itemsPromise = getItemsByPersonSlug(slug, 999);
  const person = await personPromise;
  if (!person) {
    await redirectLegacyPerson(slug);
    notFound();
  }

  const [items, defaultShows, tourCount, youtubeUrls] = await Promise.all([
    itemsPromise,
    getDefaultShowsForPerson(person.id),
    countUpcomingEventsForPerson(person.id, now),
    getPersonYouTubeUrls(person.id),
  ]);

  const blocks = buildProfileBlocks(items, defaultShows, {
    now,
    defaultShowIds: new Set(defaultShows.map((row) => row.show.id)),
    showDate: (row) => row.latestDate,
  });
  const videoCount = profileVideoCount(blocks);
  const formatCount = defaultShows.length;
  const portrait = resolvePersonPortrait(person);
  const headerBody = (
    <>
      <div className="mono text-xs uppercase mb-3" style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}>
        {person.role || "Standuper"}
      </div>
      <div className="flex items-center gap-3 flex-wrap mb-2">
        <h1 className="font-black m-0 leading-none" style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-.025em" }}>
          {person.name}<span className="dot-accent">.</span>
        </h1>
        <HeartButton
          type="person"
          slug={person.slug}
          name={person.name}
          size={32}
          inactiveColor="var(--paper)"
        />
        <span className="mono text-xs uppercase" style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}>
          {profileCountLabel(videoCount, formatCount)}
        </span>
      </div>
      {person.bio && (
        <p className="max-w-2xl" style={{ color: "var(--paper-dim)", fontSize: "17px", lineHeight: "1.55" }}>
          {person.bio}
        </p>
      )}
      <ProfileTour slug={person.slug} count={tourCount} />
    </>
  );

  return (
    <>
      <JsonLd
        data={personPageGraph({
          name: person.name,
          slug: person.slug,
          bio: person.bio,
          image: portrait ? portraitJsonLd(portrait) : null,
          sameAs: profileSameAs(youtubeUrls, person.youtube_channel_url),
        })}
      />
      <div className="band">
        <div className="max-w-6xl mx-auto">
          <header>
            {portrait ? (
              <div className="flex items-start gap-4">
                <ProfilePortrait name={person.name} portrait={portrait} />
                <div className="min-w-0 flex-1">{headerBody}</div>
              </div>
            ) : headerBody}
            {portrait ? <ProfilePortraitCredit portrait={portrait} /> : null}
          </header>

          {videoCount === 0 && formatCount === 0 && (
            <div className="text-center py-20">
              <div className="text-4xl mb-4">{"🎤"}</div>
              <p style={{ color: "var(--paper-mute)" }}>Brak materia{"ł"}{"ó"}w.</p>
            </div>
          )}
        </div>
      </div>

      {blocks.map((block) => {
        const listingHref = block.listingPath
          ? categoryBrowseHref(block.listingPath, { osoba: person.slug })
          : undefined;
        return (
          <section key={block.key} className="band">
            <div className="max-w-6xl mx-auto">
              <SectionHead
                title={block.label}
                sub={profileCountLabel(block.total, block.kind === "formaty" ? block.shows.length : 0)}
                linkHref={listingHref}
                linkText={listingHref ? "Poka\u017c wszystkie \u2192" : undefined}
              />
              {block.kind === "formaty" && block.shows.length > 0 && (
                <div className={block.items.length > 0 ? "mb-6" : undefined}>
                  <div className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide">
                    {block.shows.map(({ show, totalCount, latestDate, latestThumbnail }) => (
                      <div key={show.id} className="w-72 sm:w-80 shrink-0 snap-start">
                        <FormatCard
                          name={show.name}
                          slug={show.slug}
                          thumbnailUrl={latestThumbnail}
                          durationSeconds={null}
                          totalCount={totalCount}
                          latestDate={latestDate}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {block.items.length > 0 && <ScrollRow items={block.items} />}
            </div>
          </section>
        );
      })}
    </>
  );
}
