import type { Metadata } from "next";
import { permanentRedirect, redirect } from "next/navigation";
import JsonLd from "@/app/components/JsonLd";
import { hasBlankCityParam } from "@/lib/home-city";
import {
  OPEN_MIC_DESCRIPTION,
  OPEN_MIC_FAQS,
  OPEN_MIC_INTRO,
  OPEN_MIC_TITLE,
  openMicCityByName,
} from "@/lib/open-mic-cities";
import { getOpenMicCatalog } from "@/lib/open-mic-data";
import { openMicPageGraph } from "@/lib/open-mic-jsonld";
import {
  buildOpenMicView,
  openMicFacetRedirect,
  parseOpenMicSearchParams,
  type OpenMicSearch,
} from "@/lib/open-mics";
import { absoluteUrl, contentMetadata } from "@/lib/seo";
import OpenMicScreen from "./OpenMicScreen";

export const metadata: Metadata = contentMetadata({
  title: OPEN_MIC_TITLE,
  description: OPEN_MIC_DESCRIPTION,
  fallbackDescription: OPEN_MIC_DESCRIPTION,
  pathname: "/open-mic",
});

export const revalidate = 120;

type Props = {
  searchParams: Promise<OpenMicSearch>;
};

export default async function OpenMicPage({ searchParams }: Props) {
  const raw = await searchParams;
  const explicitAllCities = hasBlankCityParam(raw);
  const parsed = parseOpenMicSearchParams(raw);
  if (!parsed.filters.dzien && !parsed.filters.jezyk) {
    const landing = openMicCityByName(parsed.filters.miasto);
    if (landing) permanentRedirect(`/open-mic/${landing.slug}`);
  }
  if (parsed.redirectHref) redirect(parsed.redirectHref);

  const now = new Date();
  const catalog = await getOpenMicCatalog(now);
  const view = buildOpenMicView(catalog.cycles, catalog.dates, parsed.filters, now);
  if (catalog.ok) {
    const unknownCity = openMicFacetRedirect(parsed.filters, view.cities);
    if (unknownCity) redirect(unknownCity);
  }

  const pageUrl = absoluteUrl("/open-mic");

  return (
    <>
      <JsonLd
        data={openMicPageGraph({
          pageUrl,
          cycles: view.cycles,
          dates: view.dates,
          now,
          faqs: OPEN_MIC_FAQS,
        })}
      />
      <OpenMicScreen
        h1="Open mic stand-up w Polsce"
        intro={OPEN_MIC_INTRO}
        showCityLinks
        faqs={OPEN_MIC_FAQS}
        showHomeCityRedirect
        filters={parsed.filters}
        explicitAllCities={explicitAllCities}
        catalogOk={catalog.ok}
        view={view}
        now={now}
      />
    </>
  );
}
