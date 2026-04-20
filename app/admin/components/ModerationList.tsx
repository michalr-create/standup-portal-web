"use client";

import { useState, useMemo } from "react";
import ModerationCard from "./ModerationCard";

type PersonTag = { id: number; name: string; slug: string; person_id: number | null };
type ContentTag = { id: number; name: string; slug: string; tag_type: string };
type CategoryOption = { id: number; name: string; slug: string };
type ShowOption = { id: number; name: string; slug: string };

type Item = {
  id: number;
  title: string;
  url: string;
  thumbnail_url: string | null;
  published_at: string | null;
  status: string;
  content_type: string | null;
  duration_seconds: number | null;
  sourceName: string;
  categoryName: string | null;
  category_id: number | null;
  showName: string | null;
  show_id: number | null;
  assignedTagIds: number[];
  possible_duplicate_of: number | null;
  is_featured: boolean;
  duplicateOf: { id: number; title: string; url: string } | null;
};

type Props = {
  items: Item[];
  personTags: PersonTag[];
  contentTags: ContentTag[];
  categories: CategoryOption[];
  shows: ShowOption[];
  mode: "pending" | "approved" | "rejected";
  emptyMessage: string;
  emptyIcon: string;
};

export default function ModerationList({
  items,
  personTags,
  contentTags,
  categories,
  shows,
  mode,
  emptyMessage,
  emptyIcon,
}: Props) {
  const [personTagId, setPersonTagId] = useState<number | "">("");
  const [contentTagId, setContentTagId] = useState<number | "">("");

  const activeContentTags = contentTags;

  const filtered = useMemo(() => {
    let result = items;
    if (personTagId !== "") result = result.filter((i) => i.assignedTagIds.includes(personTagId as number));
    if (contentTagId !== "") result = result.filter((i) => i.assignedTagIds.includes(contentTagId as number));
    return result;
  }, [items, personTagId, contentTagId]);

  const isFiltered = personTagId !== "" || contentTagId !== "";

  if (items.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        <div className="text-4xl mb-4">{emptyIcon}</div>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {personTags.length > 0 && (
          <select
            value={personTagId}
            onChange={(e) => setPersonTagId(e.target.value === "" ? "" : Number(e.target.value))}
            className="px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded text-sm text-white focus:outline-none focus:border-neutral-500"
          >
            <option value="">Wszyscy standuperzy</option>
            {personTags.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        {activeContentTags.length > 0 && (
          <select
            value={contentTagId}
            onChange={(e) => setContentTagId(e.target.value === "" ? "" : Number(e.target.value))}
            className="px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded text-sm text-white focus:outline-none focus:border-neutral-500"
          >
            <option value="">Wszystkie tagi</option>
            {activeContentTags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}
        {isFiltered && (
          <button
            onClick={() => { setPersonTagId(""); setContentTagId(""); }}
            className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 rounded text-sm text-gray-300"
          >
            {"Wyczy\u015b\u0107 \u00d7"}
          </button>
        )}
        <span className="flex items-center text-xs text-gray-500 px-1">
          {isFiltered ? `${filtered.length} / ${items.length}` : items.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm">Brak wynik&oacute;w dla tego filtra.</div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => (
            <ModerationCard
              key={item.id}
              item={item}
              personTags={personTags}
              contentTags={contentTags}
              categories={categories}
              shows={shows}
              mode={mode}
            />
          ))}
        </div>
      )}
    </div>
  );
}
