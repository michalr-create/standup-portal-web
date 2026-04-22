"use client";

import { useState, useMemo, useTransition } from "react";
import ModerationCard from "./ModerationCard";
import { bulkUpdateAndApprove } from "../actions";

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

const selectCls = "px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded text-sm text-white focus:outline-none focus:border-neutral-500";

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
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDoneIds, setBulkDoneIds] = useState<Set<number>>(new Set());
  const [bulkCategoryId, setBulkCategoryId] = useState<string>("");
  const [bulkShowId, setBulkShowId] = useState<string>("");
  const [isBulkPending, startBulkTransition] = useTransition();
  const [tagMap, setTagMap] = useState<Map<number, number[]>>(
    () => new Map(items.map((i) => [i.id, i.assignedTagIds]))
  );

  const visibleItems = useMemo(
    () => items.filter((i) => !bulkDoneIds.has(i.id)),
    [items, bulkDoneIds]
  );

  const filtered = useMemo(() => {
    let result = visibleItems;
    if (personTagId !== "") result = result.filter((i) => i.assignedTagIds.includes(personTagId as number));
    if (contentTagId !== "") result = result.filter((i) => i.assignedTagIds.includes(contentTagId as number));
    return result;
  }, [visibleItems, personTagId, contentTagId]);

  const isFiltered = personTagId !== "" || contentTagId !== "";
  const selCount = selectedIds.size;
  const allFilteredSelected = filtered.length > 0 && filtered.every((i) => selectedIds.has(i.id));

  const toggle = (id: number) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const selectAll = () => setSelectedIds(new Set(filtered.map((i) => i.id)));
  const deselectAll = () => setSelectedIds(new Set());

  const handleBulkApprove = () => {
    const ids = Array.from(selectedIds);
    const itemsWithTags = ids.map((id) => ({ id, tagIds: tagMap.get(id) ?? [] }));
    startBulkTransition(async () => {
      await bulkUpdateAndApprove(
        itemsWithTags,
        bulkCategoryId ? Number(bulkCategoryId) : undefined,
        bulkShowId ? Number(bulkShowId) : undefined
      );
      setBulkDoneIds((prev) => new Set([...prev, ...ids]));
      setSelectedIds(new Set());
    });
  };

  if (visibleItems.length === 0 && items.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        <div className="text-4xl mb-4">{emptyIcon}</div>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Filtry */}
      <div className="flex gap-2 mb-3 flex-wrap items-center">
        {personTags.length > 0 && (
          <select value={personTagId} onChange={(e) => setPersonTagId(e.target.value === "" ? "" : Number(e.target.value))} className={selectCls}>
            <option value="">Wszyscy standuperzy</option>
            {personTags.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        {contentTags.length > 0 && (
          <select value={contentTagId} onChange={(e) => setContentTagId(e.target.value === "" ? "" : Number(e.target.value))} className={selectCls}>
            <option value="">Wszystkie tagi</option>
            {contentTags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
        {isFiltered && (
          <button onClick={() => { setPersonTagId(""); setContentTagId(""); }} className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 rounded text-sm text-gray-300">
            {"Wyczy\u015b\u0107 \u00d7"}
          </button>
        )}
        <span className="text-xs text-gray-500 px-1 ml-auto">
          {isFiltered ? `${filtered.length} / ${visibleItems.length}` : visibleItems.length}
        </span>
      </div>

      {/* Bulk action bar */}
      {selCount > 0 && (
        <div
          className={`sticky top-0 z-20 flex items-center gap-2 flex-wrap p-3 mb-3 rounded-xl border border-neutral-600 ${isBulkPending ? "opacity-60 pointer-events-none" : ""}`}
          style={{ background: "#1a1a1a" }}
        >
          <span className="text-sm font-semibold text-white mr-1">{selCount} zaznaczonych</span>
          <select value={bulkCategoryId} onChange={(e) => setBulkCategoryId(e.target.value)} className={selectCls}>
            <option value="">Kategoria bez zmian</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={bulkShowId} onChange={(e) => setBulkShowId(e.target.value)} className={selectCls}>
            <option value="">Format bez zmian</option>
            {shows.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button
            onClick={handleBulkApprove}
            className="px-4 py-1.5 bg-green-700 hover:bg-green-600 rounded text-sm font-medium text-white"
          >
            {"Zatwierd\u017a zaznaczone"}
          </button>
          <button onClick={deselectAll} className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 rounded text-sm text-gray-300">
            Odznacz
          </button>
        </div>
      )}

      {/* Zaznacz wszystkie */}
      {mode === "pending" && filtered.length > 0 && (
        <div className="flex items-center gap-3 mb-3 px-1">
          <button
            onClick={allFilteredSelected ? deselectAll : selectAll}
            className="text-xs text-gray-400 hover:text-white underline"
          >
            {allFilteredSelected ? "Odznacz wszystkie" : `Zaznacz wszystkie (${filtered.length})`}
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm">Brak wynik&oacute;w dla tego filtra.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div key={item.id} className="flex items-start gap-3">
              {mode === "pending" && (
                <div className="pt-4 shrink-0">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => toggle(item.id)}
                    className="w-4 h-4 cursor-pointer accent-green-500"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <ModerationCard
                  item={item}
                  personTags={personTags}
                  contentTags={contentTags}
                  categories={categories}
                  shows={shows}
                  mode={mode}
                  onTagsChange={(tagIds) =>
                    setTagMap((prev) => new Map(prev).set(item.id, tagIds))
                  }
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
