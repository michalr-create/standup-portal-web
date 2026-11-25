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
  const [category, query] = await Promise.all([getCategoryBySlug("roast"), searchParams]);
  if (!category) notFound();
  return contentMetadata({
    title: "Roast stand-up \u2014 bitwy i roasty",
    description: category.description,
    fallbackDescription: "Roasty i roast battle'e.",
    pathname: "/roast",
    page: pageFromSearch(query.page),
  });
}

export default function RoastPage({ searchParams }: Props) {
  return (
    <CategoryListing
      slug="roast"
      pathname="/roast"
      title="Roast"
      countWord={{ one: "roast", few: "roasty", many: "roast\u00f3w" }}
      showCategoryBadge={false}
      searchParams={searchParams}
    />
  );
}
