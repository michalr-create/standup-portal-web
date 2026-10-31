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

export default function RoastPage({ searchParams }: Props) {
  return (
    <CategoryListing
      slug="roast"
      pathname="/roast"
      title="Roast"
      countWord={{ one: "roast", many: "roast\u00f3w" }}
      showCategoryBadge={false}
      searchParams={searchParams}
    />
  );
}
