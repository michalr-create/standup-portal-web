import Link from "next/link";

type PageToken = number | "gap";

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export function pageWindow(current: number, total: number): PageToken[] {
  if (total <= 10) return range(1, total);

  const sibling = 1;
  const leftSibling = Math.max(current - sibling, 1);
  const rightSibling = Math.min(current + sibling, total);
  const showLeftGap = leftSibling > 2;
  const showRightGap = rightSibling < total - 1;

  if (!showLeftGap && showRightGap) {
    return [...range(1, 3 + sibling * 2), "gap", total];
  }
  if (showLeftGap && !showRightGap) {
    const start = total - (3 + sibling * 2) + 1;
    return [1, "gap", ...range(start, total)];
  }
  return [1, "gap", ...range(leftSibling, rightSibling), "gap", total];
}

export default function Pager({
  page,
  total,
  pageSize,
  hrefForPage,
}: {
  page: number;
  total: number;
  pageSize: number;
  hrefForPage: (page: number) => string;
}) {
  if (pageSize <= 0 || total <= pageSize) return null;

  const totalPages = Math.ceil(total / pageSize);
  const tokens = pageWindow(page, totalPages);

  return (
    <nav className="pager" aria-label="Paginacja">
      <p className="sr-only">{`Strona ${page} z ${totalPages}`}</p>
      <div className="pager-controls">
        {page > 1 ? (
          <Link href={hrefForPage(page - 1)} className="pager-btn" rel="prev">
            {"\u2190 Poprzednia"}
          </Link>
        ) : (
          <span className="pager-btn is-disabled" aria-disabled="true">
            {"\u2190 Poprzednia"}
          </span>
        )}
        {tokens.map((token, index) =>
          token === "gap" ? (
            <span key={"gap-" + index} className="pager-gap" aria-hidden="true">
              {"\u2026"}
            </span>
          ) : token === page ? (
            <span key={token} className="pager-btn is-current" aria-current="page">
              {token}
            </span>
          ) : (
            <Link
              key={token}
              href={hrefForPage(token)}
              className="pager-btn"
              aria-label={"Strona " + token}
            >
              {token}
            </Link>
          )
        )}
        {page < totalPages ? (
          <Link href={hrefForPage(page + 1)} className="pager-btn" rel="next">
            {"Nast\u0119pna \u2192"}
          </Link>
        ) : (
          <span className="pager-btn is-disabled" aria-disabled="true">
            {"Nast\u0119pna \u2192"}
          </span>
        )}
      </div>
    </nav>
  );
}
