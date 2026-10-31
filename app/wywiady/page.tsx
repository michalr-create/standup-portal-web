import CategoryListing from "@/app/components/CategoryListing";

export const revalidate = 120;

type Props = {
  searchParams: Promise<{
    page?: string | string[];
    osoba?: string | string[];
    tag?: string | string[];
    q?: string | string[];
  }>;
};

export default function WywiadyPage({ searchParams }: Props) {
  return (
    <CategoryListing
      slug="wywiady"
      pathname="/wywiady"
      title="Wywiady"
      countWord={{ one: "rozmowa", many: "rozm\u00f3w" }}
      showCategoryBadge={false}
      searchParams={searchParams}
    />
  );
}
