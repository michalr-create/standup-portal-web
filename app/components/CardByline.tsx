"use client";

import Link from "next/link";
import type { Item } from "@/lib/data";
import HeartButton from "./HeartButton";
import { timeAgo } from "@/lib/format";

const rowClass = [
  "flex h-5 min-h-5 min-w-0 flex-nowrap items-center gap-x-1.5",
  "overflow-hidden px-0.5 leading-5",
].join(" ");

const nameClass = [
  "inline-block max-w-full min-w-0 truncate align-middle",
  "hover:text-white transition-colors",
].join(" ");

/**
 * One-line people · date row. Names truncate inside the people cluster;
 * the date stays fully visible (`shrink-0`). `h-5` matches one 13px line
 * so cards with no people still line up with multi-author cards.
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
      <span className="block min-w-0 truncate">
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
          <span className="inline-block max-w-full min-w-0 truncate align-middle">
            {item.showName || ""}
          </span>
        )}
      </span>
      {hasLabel && (
        <span className="shrink-0" style={{ color: "var(--paper-meta)" }}>
          {"\u00b7"}
        </span>
      )}
      <span
        className="mono shrink-0 whitespace-nowrap"
        style={{ color: "var(--paper-meta)", fontSize: "11px" }}
      >
        {timeAgo(item.published_at)}
      </span>
    </div>
  );
}
