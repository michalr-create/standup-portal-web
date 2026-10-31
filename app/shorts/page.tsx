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
