import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CategoryListing from "@/app/components/CategoryListing";
import { getCategoryBySlug } from "@/lib/data";
import { contentMetadata, pageFromSearch } from "@/lib/seo";

export const revalidate = 120;

type Props = {
  searchParams: Promise<{
    page?: string | string[];
    osoba?: string | string[];
    tag?: string | string[];
    q?: string | string[];
  }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const [category, query] = await Promise.all([getCategoryBySlug("shorts"), searchParams]);
  if (!category) notFound();
  return contentMetadata({
    title: "Shorts stand-up \u2014 kr\u00f3tkie klipy",
    description: category.description,
    fallbackDescription: "Kr\u00f3tkie klipy i shorty stand-upowe.",
    pathname: "/shorts",
    page: pageFromSearch(query.page),
  });
}

export default function ShortsPage({ searchParams }: Props) {
  return (
    <CategoryListing
      slug="shorts"
      pathname="/shorts"
      title="Shorts"
      countWord={{ one: "kr\u00f3tki klip", few: "kr\u00f3tkie klipy", many: "kr\u00f3tkich klip\u00f3w" }}
      variant="shorts"
      showCategoryBadge={false}
      searchParams={searchParams}
    />
  );
}
