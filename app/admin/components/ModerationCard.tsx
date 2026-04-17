"use client";

import { useState, useTransition } from "react";
import {
  approveItem,
  rejectItem,
  updateItemCategory,
  updateItemShow,
  setItemPersonTags,
  mergeItems,
  dismissDuplicate,
} from "../actions";

type PersonTag = { id: number; name: string; slug: string; person_id: number | null };
type CategoryOption = { id: number; name: string; slug: string };
type ShowOption = { id: number; name: string; slug: string };

type Props = {
  item: {
    id: number;
    title: string;
    url: string;
    thumbnail_url: string | null;
    published_at: string | null;
    content_type: string | null;
    sourceName: string;
    categoryName: string | null;
    category_id: number | null;
    showName: string | null;
    show_id: number | null;
    assignedTagIds: number[];
    possible_duplicate_of: number | null;
    duplicateOf: { id: number; title: string; url: string } | null;
  };
  personTags: PersonTag[];
  categories: CategoryOption[];
  shows: ShowOption[];
};

export default function ModerationCard({ item, personTags, categories, shows }: Props) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(item.category_id);
  const [selectedShowId, setSelectedShowId] = useState<number | null>(item.show_id);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(item.assignedTagIds);

  if (done) return null;

  const handleApprove = () => {
    startTransition(async () => {
      if (selectedCategoryId !== item.category_id) {
        await updateItemCategory(item.id, selectedCategoryId);
      }
      if (selectedShowId !== item.show_id) {
        await updateItemShow(item.id, selectedShowId);
      }
      const origTags = [...item.assignedTagIds].sort().join(",");
      const newTags = [...selectedTagIds].sort().join(",");
      if (origTags !== newTags) {
        await setItemPersonTags(item.id, selectedTagIds);
      }
      await approveItem(item.id);
      setDone(true);
    });
  };

  const handleReject = () => {
    startTransition(async () => {
      await rejectItem(item.id);
      setDone(true);
    });
  };

  const handleMerge = () => {
    if (!item.possible_duplicate_of) return;
    startTransition(async () => {
      await mergeItems(item.possible_duplicate_of!, item.id);
      setDone(true);
    });
  };

  const handleDismissDuplicate = () => {
    startTransition(async () => {
      await dismissDuplicate(item.id);
    });
  };

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const formatDate = (d: string | null) => {
    if (!d) return "";
    try {
      return new Date(d).toLocaleDateString("pl-PL", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  return (
    <div className={`bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden ${isPending ? "opacity-50 pointer-events-none" : ""}`}>
      {/* Banner duplikatu */}
      {item.duplicateOf && (
        <div className="bg-yellow-900/30 border-b border-yellow-800 px-4 py-2 text-sm">
          <span className="text-yellow-300 font-medium">Mozliwa duplikacja: </span>
          <span className="text-yellow-200">{item.duplicateOf.title}</span>
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleMerge}
              className="text-xs px-3 py-1 bg-yellow-800 hover:bg-yellow-700 rounded text-white"
            >
              Polacz
            </button>
            <button
              onClick={handleDismissDuplicate}
              className="text-xs px-3 py-1 bg-neutral-700 hover:bg-neutral-600 rounded text-gray-300"
            >
              To rozne odcinki
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row">
        {/* Miniatura */}
        {item.thumbnail_url ? (
          <div className="sm:w-48 shrink-0">
            <img
              src={item.thumbnail_url}
              alt=""
              className="w-full h-full object-cover aspect-video sm:aspect-auto"
            />
          </div>
        ) : null}

        {/* Tresc */}
        <div className="flex-1 p-4 space-y-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <span>{item.sourceName}</span>
              <span>{item.content_type}</span>
              <span>{formatDate(item.published_at)}</span>
            </div>
            <h3 className="font-semibold text-sm leading-tight">
              {item.title}
            </h3>
          </div>

          {/* Kategoria */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-20">Kategoria:</span>
            <select
              value={selectedCategoryId ?? ""}
              onChange={(e) => setSelectedCategoryId(e.target.value ? Number(e.target.value) : null)}
              className="text-xs bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-white"
            >
              <option value="">-- brak --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Show */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-20">Format:</span>
            <select
              value={selectedShowId ?? ""}
              onChange={(e) => setSelectedShowId(e.target.value ? Number(e.target.value) : null)}
              className="text-xs bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-white"
            >
              <option value="">-- brak --</option>
              {shows.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Tagi person */}
          <div>
            <span className="text-xs text-gray-500 block mb-1">Standuperzy:</span>
            <div className="flex flex-wrap gap-1">
              {personTags.map((pt) => (
                <button
                  key={pt.id}
                  onClick={() => toggleTag(pt.id)}
                  className={
                    selectedTagIds.includes(pt.id)
                      ? "text-xs px-2 py-0.5 rounded-full bg-white text-black"
                      : "text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-gray-400 hover:bg-neutral-700"
                  }
                >
                  {pt.name}
                </button>
              ))}
            </div>
          </div>

          {/* Akcje */}
          <div className="flex items-center gap-2 pt-2 border-t border-neutral-800">
            <button
              onClick={handleApprove}
              className="text-xs px-4 py-1.5 bg-green-800 hover:bg-green-700 rounded font-medium text-white"
            >
              Zatwierdz
            </button>
            <button
              onClick={handleReject}
              className="text-xs px-4 py-1.5 bg-red-900 hover:bg-red-800 rounded font-medium text-white"
            >
              Odrzuc
            </button>
            
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded text-gray-300 ml-auto"
            >
              Otworz
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
