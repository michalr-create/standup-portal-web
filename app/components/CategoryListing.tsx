import { notFound, redirect } from "next/navigation";
import FilterableItemsBrowser from "@/app/components/FilterableItemsBrowser";
import Pager from "@/app/components/Pager";
import type { ItemsBrowserVariant } from "@/app/components/itemsBrowserLayout";
import {
  PUBLIC_LISTING_PAGE_SIZE,
  browsePageHref,
  listingClampHref,
  parseCategoryBrowseSearchParams,
  unknownFacetPersonHref,
  type CategoryBrowseSearch,
} from "@/lib/category-browse";
import type { CountWord } from "@/lib/listing-count";
import { getCategoryBrowse, getCategoryBySlug } from "@/lib/data";

/**
 * Category catalog. Person, tag and title filters run on the server for the
 * whole category (`?q=&osoba=&tag=&page=`), and the pager uses that total.
 */
export default async function CategoryListing({
  slug,
  pathname,
  title,
  countWord,
  variant,
  showCategoryBadge,
  searchParams,
}: {
  slug: string;
  pathname: string;
  title: string;
  countWord: CountWord;
  variant?: ItemsBrowserVariant;
  showCategoryBadge?: boolean;
  searchParams: Promise<CategoryBrowseSearch>;
}) {
  const params = await searchParams;
  const parsed = parseCategoryBrowseSearchParams(params, pathname);
  if (parsed.redirectHref) redirect(parsed.redirectHref);

  const [category, browse] = await Promise.all([
    getCategoryBySlug(slug),
    getCategoryBrowse(slug, {
      limit: PUBLIC_LISTING_PAGE_SIZE,
      offset: (parsed.page - 1) * PUBLIC_LISTING_PAGE_SIZE,
      personSlug: parsed.osoba,
      tagSlug: parsed.tag,
      search: parsed.q,
    }),
  ]);

  if (!category) notFound();

  const unknownPerson = unknownFacetPersonHref(pathname, parsed, browse.people);
  if (unknownPerson) redirect(unknownPerson);

  const clamped = listingClampHref(pathname, parsed, browse.total, PUBLIC_LISTING_PAGE_SIZE);
  if (clamped) redirect(clamped);

  const hrefForPage = (page: number) => browsePageHref(pathname, parsed, page);

  return (
    <div className="band">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="font-black m-0 leading-none" style={{ fontSize: "clamp(32px, 4vw, 44px)", letterSpacing: "-.025em" }}>
            {title}<span className="dot-accent">.</span>
          </h1>
          {category.description && (
            <p className="mt-2" style={{ color: "var(--paper-dim)", fontSize: "17px" }}>{category.description}</p>
          )}
        </header>
        <FilterableItemsBrowser
          items={browse.items}
          countWord={countWord}
          catalogTotal={browse.total}
          variant={variant}
          showCategoryBadge={showCategoryBadge}
          serverFilters={{
            pathname,
            personSlug: parsed.osoba,
            tagSlug: parsed.tag,
            search: parsed.q,
            people: browse.people,
            tags: browse.tags,
          }}
        />
        <Pager
          page={parsed.page}
          total={browse.total}
          pageSize={PUBLIC_LISTING_PAGE_SIZE}
          hrefForPage={hrefForPage}
        />
      </div>
    </div>
  );
}
