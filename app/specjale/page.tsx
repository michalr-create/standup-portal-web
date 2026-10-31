import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import { getTagBrowse } from "@/lib/data";
import FilterableItemsBrowser from "@/app/components/FilterableItemsBrowser";
import Pager from "@/app/components/Pager";
import {
  PUBLIC_LISTING_PAGE_SIZE,
  browsePageHref,
  categoryBrowseHref,
  listingClampHref,
  parseCategoryBrowseSearchParams,
  unknownFacetPersonHref,
  type CategoryBrowseSearch,
} from "@/lib/category-browse";
import { SPECJALE_CACHE_TAG } from "@/lib/revalidate-content";

export const revalidate = 120;

const PATHNAME = "/specjale";
const DEFINING_TAG = "special";

const getSpecialsBrowse = unstable_cache(
  (offset: number, personSlug: string, tagSlug: string, search: string) =>
    getTagBrowse(DEFINING_TAG, {
      limit: PUBLIC_LISTING_PAGE_SIZE,
      offset,
      personSlug,
      tagSlug,
      search,
    }),
  ["specjale", "browse", String(PUBLIC_LISTING_PAGE_SIZE)],
  { revalidate: 120, tags: [SPECJALE_CACHE_TAG] },
);

function withoutDefiningTag(params: CategoryBrowseSearch): { search: CategoryBrowseSearch; dropped: boolean } {
  const raw = Array.isArray(params.tag) ? params.tag[0] : params.tag;
  if (raw == null || raw.trim().toLowerCase() !== DEFINING_TAG) return { search: params, dropped: false };
  const { tag: _tag, ...rest } = params;
  return { search: rest, dropped: true };
}

type Props = {
  searchParams: Promise<CategoryBrowseSearch>;
};

export default async function SpecjalePage({ searchParams }: Props) {
  const incoming = await searchParams;
  const { search, dropped } = withoutDefiningTag(incoming);
  const parsed = parseCategoryBrowseSearchParams(search, PATHNAME);
  if (parsed.redirectHref || dropped) {
    redirect(parsed.redirectHref ?? categoryBrowseHref(PATHNAME, parsed));
  }

  const browse = await getSpecialsBrowse(
    (parsed.page - 1) * PUBLIC_LISTING_PAGE_SIZE,
    parsed.osoba,
    parsed.tag,
    parsed.q,
  );

  const unknownPerson = unknownFacetPersonHref(PATHNAME, parsed, browse.people);
  if (unknownPerson) redirect(unknownPerson);

  const clamped = listingClampHref(PATHNAME, parsed, browse.total, PUBLIC_LISTING_PAGE_SIZE);
  if (clamped) redirect(clamped);

  const hrefForPage = (page: number) => browsePageHref(PATHNAME, parsed, page);

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
          items={browse.items}
          countWord={{ one: "specjal", few: "specjale", many: "specjali" }}
          catalogTotal={browse.total}
          hiddenTagSlugs={[DEFINING_TAG]}
          serverFilters={{
            pathname: PATHNAME,
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
