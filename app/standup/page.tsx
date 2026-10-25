import { redirect, notFound } from "next/navigation";
import { getCategoryBrowse, getCategoryBySlug } from "@/lib/data";
import {
  categoryBrowseHref,
  parseCategoryBrowseSearchParams,
} from "@/lib/category-browse";
import FilterableItemsBrowser from "@/app/components/FilterableItemsBrowser";
import Pager from "@/app/components/Pager";

export const revalidate = 120;

const PAGE_SIZE = 100;
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
      limit: PAGE_SIZE,
      offset: (parsed.page - 1) * PAGE_SIZE,
      personSlug: parsed.osoba,
      tagSlug: parsed.tag,
      search: parsed.q,
    }),
  ]);

  if (!category) notFound();

  if (parsed.osoba && browse.people.length > 0 && !browse.people.some((person) => person.slug === parsed.osoba)) {
    redirect(categoryBrowseHref(PATHNAME, { tag: parsed.tag, q: parsed.q, page: parsed.page }));
  }

  const totalPages = browse.total === 0 ? 1 : Math.ceil(browse.total / PAGE_SIZE);
  if (parsed.page > totalPages) {
    redirect(categoryBrowseHref(PATHNAME, {
      osoba: parsed.osoba,
      tag: parsed.tag,
      q: parsed.q,
      page: totalPages,
    }));
  }

  const hrefForPage = (page: number) => categoryBrowseHref(PATHNAME, {
    osoba: parsed.osoba,
    tag: parsed.tag,
    q: parsed.q,
    page,
  });

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
        />
        <Pager page={parsed.page} total={browse.total} pageSize={PAGE_SIZE} hrefForPage={hrefForPage} />
      </div>
    </div>
  );
}
