"use client";

import Link from "next/link";
import type { Item } from "@/lib/data";
import HeartButton from "./HeartButton";
import { timeAgo } from "@/lib/format";

const rowClass = [
  "flex h-5 min-h-5 min-w-0 flex-nowrap items-center gap-x-1.5",
  "pl-0.5 pr-1.5 leading-5",
].join(" ");

const peopleClass = "card-byline-people block min-w-0";

const nameClass = [
  "align-middle rounded-sm transition-colors hover:text-white",
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]",
].join(" ");

const dateGroupClass = "inline-flex shrink-0 items-center gap-x-1.5";

/**
 * One-line people · date row. Names ellipsize at the end of the people
 * cluster, so the first co-authors stay readable. The date middot lives
 * with the date in a `shrink-0` group, outside that clip, so the ellipsis
 * cannot eat the separator. `h-5` keeps every card meta on one line.
 * The row does not clip vertically: each co-author heart is a 20px glyph
 * with an absolute 44px hit target.
 */
export default function CardByline({
  item,
  className = "mt-1.5",
}: {
  item: Item;
  className?: string;
}) {
  const hasPeople = item.people.length > 0;
  const multi = item.people.length > 1;
  const hasLabel = hasPeople || Boolean(item.showName);

  return (
    <div
      className={`${className} ${rowClass}`}
      data-card-meta=""
      style={{ color: "var(--paper-dim)", fontSize: "13px" }}
    >
      <span className={`${peopleClass} ${multi ? "pr-2" : "pr-1"}`}>
        {hasPeople ? (
          item.people.map((p, i) => (
            <span key={p.slug}>
              {i > 0 && (
                <span className="px-1.5" style={{ color: "var(--paper-meta)" }}>
                  {"\u00b7"}
                </span>
              )}
              <Link href={"/standuper/" + p.slug} className={nameClass}>
                {p.name}
              </Link>
              {multi && (
                <span className="ml-1 inline-flex align-middle">
                  <HeartButton type="person" slug={p.slug} name={p.name} size={15} compact />
                </span>
              )}
            </span>
          ))
        ) : item.showSlug && item.showName ? (
          <Link href={"/format/" + item.showSlug} className={nameClass}>
            {item.showName}
          </Link>
        ) : (
          item.showName || ""
        )}
      </span>
      <span className={dateGroupClass} data-card-date="">
        {hasLabel && (
          <span style={{ color: "var(--paper-meta)" }}>{"\u00b7"}</span>
        )}
        <span
          className="mono whitespace-nowrap"
          style={{ color: "var(--paper-meta)", fontSize: "11px" }}
        >
          {timeAgo(item.published_at)}
        </span>
      </span>
    </div>
  );
}
