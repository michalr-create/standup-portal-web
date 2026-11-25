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
  const [category, query] = await Promise.all([getCategoryBySlug("wywiady"), searchParams]);
  if (!category) notFound();
  return contentMetadata({
    title: "Wywiady stand-up \u2014 rozmowy",
    description: category.description,
    fallbackDescription: "Wywiady ze standuperami w mediach.",
    pathname: "/wywiady",
    page: pageFromSearch(query.page),
  });
}

export default function WywiadyPage({ searchParams }: Props) {
  return (
    <CategoryListing
      slug="wywiady"
      pathname="/wywiady"
      title="Wywiady"
      countWord={{ one: "wywiad", few: "wywiady", many: "wywiad\u00f3w" }}
      showCategoryBadge={false}
      searchParams={searchParams}
    />
  );
}
