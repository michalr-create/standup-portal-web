import type { MetadataRoute } from "next";
import { getAllPeople, getAllSpecialSlugs, getSitemapEventIds, getSitemapShows } from "@/lib/data";
import { buildSitemap, specialLastModified } from "@/lib/seo";

export const revalidate = 120;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [people, shows, specials, eventIds] = await Promise.all([
    getAllPeople(),
    getSitemapShows(),
    getAllSpecialSlugs(),
    getSitemapEventIds(),
  ]);
  return buildSitemap(
    people.map((person) => person.slug),
    shows.map((show) => show.slug),
    specials.map((special) => ({
      slug: special.slug,
      lastModified: specialLastModified(special.published_at, special.approved_at) ?? null,
    })),
    eventIds,
  );
}
