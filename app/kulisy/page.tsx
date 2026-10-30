import CategoryListing from "@/app/components/CategoryListing";

export const revalidate = 120;

type Props = {
  searchParams: Promise<{ page?: string | string[] }>;
};

export default function KulisyPage({ searchParams }: Props) {
  return (
    <CategoryListing
      slug="kulisy"
      pathname="/kulisy"
      title="Kulisy"
      countWord={{ one: "materia\u0142", many: "materia\u0142\u00f3w" }}
      showCategoryBadge={false}
      searchParams={searchParams}
    />
  );
}
