"use client";

import Link from "next/link";
import type { Item } from "@/lib/data";
import HeartButton from "./HeartButton";
import { timeAgo } from "@/lib/format";

const rowClass = [
  "flex h-5 min-h-5 min-w-0 flex-nowrap items-center gap-x-1.5",
  "overflow-hidden pl-0.5 pr-1.5 leading-5",
].join(" ");

const peopleClass = "block min-w-0 truncate pr-1";

const nameClass = "align-middle hover:text-white transition-colors";

const dateGroupClass = "inline-flex shrink-0 items-center gap-x-1.5";

/**
 * One-line people · date row. Names ellipsize only inside the people
 * cluster (`min-w-0 truncate`). The date middot lives with the date in a
 * `shrink-0` group, outside that overflow box, so the ellipsis cannot eat
 * the separator. `h-5` keeps every card meta on one line.
 */
export default function CardByline({
  item,
  className = "mt-1.5",
}: {
  item: Item;
  className?: string;
}) {
  const hasPeople = item.people.length > 0;
  const hasLabel = hasPeople || Boolean(item.showName);

  return (
    <div
      className={`${className} ${rowClass}`}
      data-card-meta=""
      style={{ color: "var(--paper-dim)", fontSize: "13px" }}
    >
      <span className={peopleClass}>
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
              {item.people.length > 1 && (
                <span className="-my-3 ml-1 inline-flex align-middle">
                  <HeartButton type="person" slug={p.slug} name={p.name} size={15} />
                </span>
              )}
            </span>
          ))
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
