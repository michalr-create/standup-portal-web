import { notFound, redirect } from "next/navigation";
import FilterableItemsBrowser from "@/app/components/FilterableItemsBrowser";
import Pager from "@/app/components/Pager";
import type { ItemsBrowserVariant } from "@/app/components/itemsBrowserLayout";
import {
  PUBLIC_LISTING_PAGE_SIZE,
  clampListingPage,
  listingPageHref,
  parseListingPage,
} from "@/lib/category-browse";
import { getCategoryBySlug, getItemsByCategorySlugPage } from "@/lib/data";

type CountWord = { one: string; many: string };

/**
 * Category catalog with URL pages. Person/tag/search chips still filter the
 * current page only; catalogTotal and the pager use the full server count.
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
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const params = await searchParams;
  const parsed = parseListingPage(params.page, pathname);
  if (parsed.redirectHref) redirect(parsed.redirectHref);

  const [category, pageResult] = await Promise.all([
    getCategoryBySlug(slug),
    getItemsByCategorySlugPage(
      slug,
      PUBLIC_LISTING_PAGE_SIZE,
      (parsed.page - 1) * PUBLIC_LISTING_PAGE_SIZE,
    ),
  ]);

  if (!category) notFound();

  const clamped = clampListingPage(parsed.page, pageResult.total, PUBLIC_LISTING_PAGE_SIZE);
  if (clamped.page !== parsed.page) redirect(listingPageHref(pathname, clamped.page));

  const hrefForPage = (page: number) => listingPageHref(pathname, page);

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
          items={pageResult.items}
          countWord={countWord}
          catalogTotal={pageResult.total}
          variant={variant}
          showCategoryBadge={showCategoryBadge}
        />
        <Pager
          page={parsed.page}
          total={pageResult.total}
          pageSize={PUBLIC_LISTING_PAGE_SIZE}
          hrefForPage={hrefForPage}
        />
      </div>
    </div>
  );
}
