"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import ItemsBrowser from "@/app/components/ItemsBrowser";
import type { Item } from "@/lib/data";
import { itemDisplayTitle } from "@/lib/display-title";
import { IMAGE_SIZE, contentThumbnailAlt } from "@/lib/image-alt";
import { collapseBy, type ProgramFields } from "@/lib/program-parts";
import SizedImage from "./SizedImage";

function itemFields(item: Item): ProgramFields {
  return {
    id: item.id,
    title: item.title,
    showId: item.show_id,
    publishedAt: item.published_at,
  };
}

function czescLabel(n: number): string {
  return n === 1 ? "cz\u0119\u015b\u0107" : "cz\u0119\u015bci";
}

function ProgramBlock({
  name,
  parts,
  showCategoryBadge,
}: {
  name: string;
  parts: Item[];
  showCategoryBadge: boolean;
}) {
  const [open, setOpen] = useState(false);
  const cover = parts[0];
  const panelId = `program-parts-${cover?.id ?? name}`;

  return (
    <section
      className="sm:col-span-2 lg:col-span-3 xl:col-span-4"
      style={{
        border: "1px solid var(--line)",
        borderRadius: "14px",
        background: "var(--ink-2)",
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        {cover?.thumbnail_url ? (
          <SizedImage
            src={cover.thumbnail_url}
            alt={
              contentThumbnailAlt({
                title: itemDisplayTitle(cover),
                people: cover.people,
                showName: cover.showName,
              }) || name
            }
            width={IMAGE_SIZE.programCover.width}
            height={IMAGE_SIZE.programCover.height}
            className="h-16 w-28 shrink-0 rounded-[10px] object-cover"
          />
        ) : (
          <span className="h-16 w-28 shrink-0 rounded-[10px]" style={{ background: "var(--ink-3)" }} />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-extrabold" style={{ letterSpacing: "-.01em" }}>{name}</span>
          <span className="mono mt-0.5 block text-[13px]" style={{ color: "var(--paper-dim)" }}>
            {parts.length} {czescLabel(parts.length)}
          </span>
        </span>
        <span className="shrink-0 text-sm font-bold" style={{ color: "var(--coral)" }}>
          {open ? "Ukryj" : "Poka\u017c"}
        </span>
      </button>
      {open && (
        <div id={panelId} className="px-3 pb-4">
          <ItemsBrowser items={parts} showCategoryBadge={showCategoryBadge} />
        </div>
      )}
    </section>
  );
}

export default function ProgramCatalog({
  items,
  showCategoryBadge = true,
}: {
  items: Item[];
  showCategoryBadge?: boolean;
}) {
  const groups = collapseBy(items, itemFields);
  const blocks: ReactNode[] = [];
  let singles: Item[] = [];
  let batch = 0;

  const flush = () => {
    if (singles.length === 0) return;
    const batchItems = singles;
    singles = [];
    blocks.push(
      <ItemsBrowser
        key={`singles-${batch}`}
        items={batchItems}
        showCategoryBadge={showCategoryBadge}
      />,
    );
    batch += 1;
  };

  for (const group of groups) {
    if (group.parts.length < 2) {
      const only = group.parts[0];
      if (only) singles.push(only);
      continue;
    }
    flush();
    blocks.push(
      <ProgramBlock
        key={group.key}
        name={group.name}
        parts={group.parts}
        showCategoryBadge={showCategoryBadge}
      />,
    );
  }
  flush();

  if (blocks.length === 0) return null;
  if (blocks.length === 1 && groups.every((group) => group.parts.length < 2)) return blocks[0] ?? null;

  return <div className="flex flex-col gap-5">{blocks}</div>;
}
