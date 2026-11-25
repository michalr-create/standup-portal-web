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
  const [category, query] = await Promise.all([getCategoryBySlug("kulisy"), searchParams]);
  if (!category) notFound();
  return contentMetadata({
    title: "Kulisy stand-upu \u2014 zza kulis",
    description: category.description,
    fallbackDescription: "Vlogi, relacje z wyst\u0119p\u00f3w, zapowiedzi i materia\u0142y zza kulis.",
    pathname: "/kulisy",
    page: pageFromSearch(query.page),
  });
}

export default function KulisyPage({ searchParams }: Props) {
  return (
    <CategoryListing
      slug="kulisy"
      pathname="/kulisy"
      title="Kulisy"
      countWord={{ one: "materia\u0142", few: "materia\u0142y", many: "materia\u0142\u00f3w" }}
      showCategoryBadge={false}
      searchParams={searchParams}
    />
  );
}
