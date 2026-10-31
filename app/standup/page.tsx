import { redirect, notFound } from "next/navigation";
import { getCategoryBrowse, getCategoryBySlug } from "@/lib/data";
import {
  PUBLIC_LISTING_PAGE_SIZE,
  browsePageHref,
  listingClampHref,
  parseCategoryBrowseSearchParams,
  unknownFacetPersonHref,
} from "@/lib/category-browse";
import FilterableItemsBrowser from "@/app/components/FilterableItemsBrowser";
import Pager from "@/app/components/Pager";

export const revalidate = 120;

const PATHNAME = "/standup";

type Props = {
  searchParams: Promise<{
    page?: string | string[];
    osoba?: string | string[];
    tag?: string | string[];
    q?: string | string[];
  }>;
};

export default async function StandupPage({ searchParams }: Props) {
  const params = await searchParams;
  const parsed = parseCategoryBrowseSearchParams(params, PATHNAME);
  if (parsed.redirectHref) redirect(parsed.redirectHref);

  const [category, browse] = await Promise.all([
    getCategoryBySlug("standup"),
    getCategoryBrowse("standup", {
      limit: PUBLIC_LISTING_PAGE_SIZE,
      offset: (parsed.page - 1) * PUBLIC_LISTING_PAGE_SIZE,
      personSlug: parsed.osoba,
      tagSlug: parsed.tag,
      search: parsed.q,
    }),
  ]);

  if (!category) notFound();

  const unknownPerson = unknownFacetPersonHref(PATHNAME, parsed, browse.people);
  if (unknownPerson) redirect(unknownPerson);

  const clamped = listingClampHref(PATHNAME, parsed, browse.total, PUBLIC_LISTING_PAGE_SIZE);
  if (clamped) redirect(clamped);

  const hrefForPage = (page: number) => browsePageHref(PATHNAME, parsed, page);

  return (
    <div className="band">
      <div className="max-w-6xl mx-auto">
        <header className="mb-4 md:mb-8">
          <h1 className="font-black m-0 leading-none" style={{ fontSize: "clamp(32px, 4vw, 44px)", letterSpacing: "-.025em" }}>
            {category.name}<span className="dot-accent">.</span>
          </h1>
          {category.description && (
            <p className="mt-2 text-[15px] md:text-[17px]" style={{ color: "var(--paper-dim)" }}>{category.description}</p>
          )}
        </header>
        <FilterableItemsBrowser
          items={browse.items}
          countWord={{ one: "pozycja", many: "pozycji" }}
          catalogTotal={browse.total}
          tagChipOrder="standup"
          serverFilters={{
            pathname: PATHNAME,
            personSlug: parsed.osoba,
            tagSlug: parsed.tag,
            search: parsed.q,
            people: browse.people,
            tags: browse.tags,
          }}
          showCategoryBadge={false}
        />
        <Pager page={parsed.page} total={browse.total} pageSize={PUBLIC_LISTING_PAGE_SIZE} hrefForPage={hrefForPage} />
      </div>
    </div>
  );
}
