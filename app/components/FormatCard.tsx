"use client";

import Link from "next/link";
import HeartButton from "./HeartButton";
import ThumbDuration from "./ThumbDuration";
import { timeAgo } from "@/lib/format";

function odcinekLabel(n: number): string {
  if (n === 1) return "odcinek";
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 > 20)) return "odcinki";
  return "odcinków";
}

export type FormatCardProps = {
  name: string;
  slug: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  totalCount: number;
  latestDate: string | null;
};

/**
 * Format entry in the same thumb-and-title pattern as video cards.
 * The image is the latest episode, not the show's own artwork.
 */
export default function FormatCard({
  name,
  slug,
  thumbnailUrl,
  durationSeconds,
  totalCount,
  latestDate,
}: FormatCardProps) {
  return (
    <article className="group vcard relative text-left w-full min-w-0">
      <Link
        href={"/format/" + slug}
        className="block text-left w-full rounded-[14px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]"
      >
        <div
          className="overflow-hidden relative"
          style={{
            aspectRatio: "16/10",
            borderRadius: "14px",
            border: "1px solid var(--line)",
            background: "var(--ink-3)",
          }}
        >
          {thumbnailUrl && (
            <img
              src={thumbnailUrl}
              alt=""
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          )}
          <ThumbDuration seconds={durationSeconds} isPaid={false} />
          <div
            className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold"
            style={{
              background: "rgba(11,11,11,.75)",
              backdropFilter: "blur(6px)",
              color: "var(--paper)",
              fontSize: "11px",
            }}
          >
            <span className="inline-block w-2 h-2 rounded-sm" style={{ background: "var(--coral)" }} />
            Format
          </div>
        </div>
        <div className="pt-3 px-0.5">
          <h4
            className="font-extrabold leading-tight line-clamp-2"
            style={{ fontSize: "16px", letterSpacing: "-.01em" }}
          >
            {name}
          </h4>
        </div>
        <div
          className="mt-1.5 flex h-5 min-w-0 items-center gap-x-1.5 pl-0.5 pr-1.5"
          style={{ color: "var(--paper-dim)", fontSize: "13px" }}
        >
          <span className="min-w-0 truncate">
            {totalCount} {odcinekLabel(totalCount)}
          </span>
          {latestDate && (
            <span className="inline-flex shrink-0 items-center gap-x-1.5">
              <span style={{ color: "var(--paper-meta)" }}>{"\u00b7"}</span>
              <span
                className="mono whitespace-nowrap"
                style={{ color: "var(--paper-meta)", fontSize: "11px" }}
              >
                {timeAgo(latestDate)}
              </span>
            </span>
          )}
        </div>
      </Link>
      <div className="absolute top-1 right-1 z-20">
        <HeartButton type="show" slug={slug} name={name} size={15} overlay />
      </div>
    </article>
  );
}
