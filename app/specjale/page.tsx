import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import { getItemsByTagSlugPage } from "@/lib/data";
import FilterableItemsBrowser from "@/app/components/FilterableItemsBrowser";
import Pager from "@/app/components/Pager";

export const revalidate = 120;

const PAGE_SIZE = 24;

const getSpecialsPage = unstable_cache(
  (offset: number) => getItemsByTagSlugPage("special", PAGE_SIZE, offset),
  ["specjale", "special", String(PAGE_SIZE)],
  { revalidate: 120 },
);

function specjaleHref(page: number): string {
  return page <= 1 ? "/specjale" : "/specjale?page=" + page;
}

function parsePage(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value == null || value === "") return 1;
  if (!/^[1-9]\d{0,4}$/.test(value)) return null;
  return Number(value);
}

type Props = {
  searchParams: Promise<{ page?: string | string[] }>;
};

export default async function SpecjalePage({ searchParams }: Props) {
  const params = await searchParams;
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;
  const page = parsePage(params.page);
  if (page == null || (rawPage != null && rawPage !== "" && page === 1)) {
    redirect("/specjale");
  }

  const { items, total } = await getSpecialsPage((page - 1) * PAGE_SIZE);
  const totalPages = total === 0 ? 1 : Math.ceil(total / PAGE_SIZE);
  if (page > totalPages) redirect(specjaleHref(totalPages));

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
        <Pager page={page} total={total} pageSize={PAGE_SIZE} hrefForPage={specjaleHref} />
      </div>
    </div>
  );
}
