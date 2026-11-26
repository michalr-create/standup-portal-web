import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import JsonLd from "@/app/components/JsonLd";
import { getOpenMicCatalog } from "@/lib/open-mic-data";
import { openMicPageGraph } from "@/lib/open-mic-jsonld";
import {
  OPEN_MIC_CITIES,
  openMicCityDescription,
  openMicCityFaqNote,
  openMicCityFaqs,
  openMicCityHeading,
  openMicCityTitle,
  resolveOpenMicCityParam,
} from "@/lib/open-mic-cities";
import { buildOpenMicView, emptyOpenMicFilters } from "@/lib/open-mics";
import { absoluteUrl, contentMetadata } from "@/lib/seo";
import OpenMicScreen from "../OpenMicScreen";

export const revalidate = 120;

type Props = {
  params: Promise<{ miasto: string }>;
};

export function generateStaticParams() {
  return OPEN_MIC_CITIES.map((city) => ({ miasto: city.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { miasto } = await params;
  const resolved = resolveOpenMicCityParam(miasto);
  if (!resolved) notFound();
  if (resolved.redirect) permanentRedirect(`/open-mic/${resolved.city.slug}`);
  const description = openMicCityDescription(resolved.city);
  return contentMetadata({
    title: openMicCityTitle(resolved.city),
    description,
    fallbackDescription: description,
    pathname: `/open-mic/${resolved.city.slug}`,
    preserveDescription: true,
  });
}

export default async function OpenMicCityPage({ params }: Props) {
  const { miasto } = await params;
  const resolved = resolveOpenMicCityParam(miasto);
  if (!resolved) notFound();
  if (resolved.redirect) permanentRedirect(`/open-mic/${resolved.city.slug}`);

  const city = resolved.city;
  const filters = { ...emptyOpenMicFilters(), miasto: city.name };
  const now = new Date();
  const catalog = await getOpenMicCatalog(now);
  const view = buildOpenMicView(catalog.cycles, catalog.dates, filters, now);
  const pageUrl = absoluteUrl(`/open-mic/${city.slug}`);
  const faqs = openMicCityFaqs();

  return (
    <>
      <JsonLd
        data={openMicPageGraph({
          pageUrl,
          cycles: view.cycles,
          dates: view.dates,
          now,
          faqs,
          breadcrumbs: [
            { name: "Start", url: absoluteUrl("/") },
            { name: "Open mic", url: absoluteUrl("/open-mic") },
            { name: city.name, url: pageUrl },
          ],
        })}
      />
      <OpenMicScreen
        h1={openMicCityHeading(city)}
        intro={city.intro}
        breadcrumbs={[
          { name: "Start", href: "/" },
          { name: "Open mic", href: "/open-mic" },
          { name: city.name, href: `/open-mic/${city.slug}`, current: true },
        ]}
        faqs={faqs}
        faqNote={openMicCityFaqNote(city)}
        filters={filters}
        catalogOk={catalog.ok}
        view={view}
        now={now}
      />
    </>
  );
}
