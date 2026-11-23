import { redirect } from "next/navigation";
import { parseListingPage } from "@/lib/category-browse";
import FavoriteContent from "./FavoriteContent";

const PATHNAME = "/ulubione/tresci";

export const metadata = {
  title: "Ulubione — parska.",
  description: "Wszystkie nagrania obserwowanych osób i formatów.",
};

type Props = {
  searchParams: Promise<{ page?: string | string[] }>;
};

export default async function FavoriteContentPage({ searchParams }: Props) {
  const params = await searchParams;
  const parsed = parseListingPage(params.page, PATHNAME);
  if (parsed.redirectHref) redirect(parsed.redirectHref);
  return <FavoriteContent page={parsed.page} />;
}
