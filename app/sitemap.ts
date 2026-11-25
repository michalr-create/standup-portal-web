import type { MetadataRoute } from "next";
import { getAllPeople, getAllShows } from "@/lib/data";
import { buildSitemap } from "@/lib/seo";

export const revalidate = 120;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [people, shows] = await Promise.all([getAllPeople(), getAllShows()]);
  return buildSitemap(
    people.map((person) => person.slug),
    shows.map((show) => show.slug),
  );
}
