import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { parseListingPage } from "@/lib/category-browse";
import { noindexMetadata } from "@/lib/seo";
import FavoriteContent from "./FavoriteContent";

const PATHNAME = "/ulubione/tresci";

export const metadata: Metadata = noindexMetadata(
  "Ulubione tre\u015bci",
  PATHNAME,
  "Wszystkie nagrania obserwowanych os\u00f3b i format\u00f3w.",
);

type Props = {
  searchParams: Promise<{ page?: string | string[] }>;
};

export default async function FavoriteContentPage({ searchParams }: Props) {
  const params = await searchParams;
  const parsed = parseListingPage(params.page, PATHNAME);
  if (parsed.redirectHref) redirect(parsed.redirectHref);
  return <FavoriteContent page={parsed.page} />;
}
