import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import { getItemsByTagSlugPage } from "@/lib/data";
import FilterableItemsBrowser from "@/app/components/FilterableItemsBrowser";
import Pager from "@/app/components/Pager";
import {
  PUBLIC_LISTING_PAGE_SIZE,
  clampListingPage,
  listingPageHref,
  parseListingPage,
} from "@/lib/category-browse";

export const revalidate = 120;

const PATHNAME = "/specjale";

const getSpecialsPage = unstable_cache(
  (offset: number) => getItemsByTagSlugPage("special", PUBLIC_LISTING_PAGE_SIZE, offset),
  ["specjale", "special", String(PUBLIC_LISTING_PAGE_SIZE)],
  { revalidate: 120 },
);

type Props = {
  searchParams: Promise<{ page?: string | string[] }>;
};

export default async function SpecjalePage({ searchParams }: Props) {
  const params = await searchParams;
  const parsed = parseListingPage(params.page, PATHNAME);
  if (parsed.redirectHref) redirect(parsed.redirectHref);

  const { items, total } = await getSpecialsPage((parsed.page - 1) * PUBLIC_LISTING_PAGE_SIZE);
  const clamped = clampListingPage(parsed.page, total, PUBLIC_LISTING_PAGE_SIZE);
  if (clamped.page !== parsed.page) redirect(listingPageHref(PATHNAME, clamped.page));

  return (
    <div className="band">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="font-black m-0 leading-none" style={{ fontSize: "clamp(32px, 4vw, 44px)", letterSpacing: "-.025em" }}>
            Specjale<span className="dot-accent">.</span>
          </h1>
          <p className="mt-2" style={{ color: "var(--paper-dim)", fontSize: "17px" }}>
            {"Pe\u0142nometra\u017cowe programy stand-upowe."}
          </p>
        </header>
        <FilterableItemsBrowser
          items={items}
          countWord={{ one: "specjal", many: "specjali" }}
          catalogTotal={total}
        />
        <Pager
          page={parsed.page}
          total={total}
          pageSize={PUBLIC_LISTING_PAGE_SIZE}
          hrefForPage={(page) => listingPageHref(PATHNAME, page)}
        />
      </div>
    </div>
  );
}
