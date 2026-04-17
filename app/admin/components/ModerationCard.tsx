"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  approveItem,
  rejectItem,
  revertToPending,
  updateItemCategory,
  updateItemShow,
  setItemTags,
  mergeItems,
  toggleFeatured,
  dismissDuplicate,
} from "../actions";
import { createTag } from "../actions-sources";

type PersonTag = { id: number; name: string; slug: string; person_id: number | null };
type ContentTag = { id: number; name: string; slug: string; tag_type: string };
type CategoryOption = { id: number; name: string; slug: string };
type ShowOption = { id: number; name: string; slug: string };

type Props = {
  item: {
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
  personTags: PersonTag[];
  contentTags: ContentTag[];
  categories: CategoryOption[];
  shows: ShowOption[];
  mode: "pending" | "approved" | "rejected";
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "";
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function ModerationCard({ item, personTags, contentTags, categories, shows, mode }: Props) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(item.category_id);
  const [selectedShowId, setSelectedShowId] = useState<number | null>(item.show_id);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(item.assignedTagIds);
  const [dirty, setDirty] = useState(false);
  const [featured, setFeatured] = useState(item.is_featured || false);

  // Nowy tag inline
  const [showNewTag, setShowNewTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagType, setNewTagType] = useState("topic");
  const [newTagError, setNewTagError] = useState("");
  const [localContentTags, setLocalContentTags] = useState(contentTags);

  if (done) return null;

  const allTagIds = [...selectedTagIds];

  const saveChanges = async () => {
    if (selectedCategoryId !== item.category_id) {
      await updateItemCategory(item.id, selectedCategoryId);
    }
    if (selectedShowId !== item.show_id) {
      await updateItemShow(item.id, selectedShowId);
    }
    const origTags = [...item.assignedTagIds].sort().join(",");
    const newTags = [...selectedTagIds].sort().join(",");
    if (origTags !== newTags) {
      await setItemTags(item.id, selectedTagIds);
    }
  };

  const handleApprove = () => {
    startTransition(async () => {
      await saveChanges();
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

  const handleRevert = () => {
    startTransition(async () => {
      await revertToPending(item.id);
      setDone(true);
    });
  };

  const handleSave = () => {
    startTransition(async () => {
      await saveChanges();
      setDirty(false);
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
    setDirty(true);
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    const slug = slugify(newTagName);
    const result = await createTag({ name: newTagName.trim(), slug, tag_type: newTagType });
    if (result.error) {
      setNewTagError(result.error);
    } else if (result.tag) {
      setLocalContentTags((prev) => [...prev, result.tag!].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedTagIds((prev) => [...prev, result.tag!.id]);
      setDirty(true);
      setNewTagName("");
      setShowNewTag(false);
      setNewTagError("");
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "";
    try {
      return new Date(d).toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return "";
    }
  };

  // Grupowanie content tagow po typie
  const tagsByType = new Map<string, ContentTag[]>();
  for (const tag of localContentTags) {
    if (!tagsByType.has(tag.tag_type)) {
      tagsByType.set(tag.tag_type, []);
    }
    tagsByType.get(tag.tag_type)!.push(tag);
  }

  const tagTypeLabels: Record<string, string> = {
    topic: "Temat",
    format: "Format",
    event: "Wydarzenie",
    wystapienie_goscinne: "Typ",
  };

  return (
    <div className={`bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden ${isPending ? "opacity-50 pointer-events-none" : ""}`}>
      {item.duplicateOf && mode === "pending" && (
        <div className="bg-yellow-900/30 border-b border-yellow-800 px-4 py-2 text-sm">
          <span className="text-yellow-300 font-medium">Mozliwa duplikacja: </span>
          <span className="text-yellow-200">{item.duplicateOf.title}</span>
          <div className="flex gap-2 mt-2">
            <button onClick={handleMerge} className="text-xs px-3 py-1 bg-yellow-800 hover:bg-yellow-700 rounded text-white">Polacz</button>
            <button onClick={handleDismissDuplicate} className="text-xs px-3 py-1 bg-neutral-700 hover:bg-neutral-600 rounded text-gray-300">To rozne odcinki</button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row">
        {item.thumbnail_url ? (
          <div className="sm:w-48 shrink-0 relative">
            <img src={item.thumbnail_url} alt="" className="w-full h-full object-cover aspect-video sm:aspect-auto" />
            {item.duration_seconds != null && (
              <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                {formatDuration(item.duration_seconds)}
              </div>
            )}
          </div>
        ) : null}

        <div className="flex-1 p-4 space-y-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <span>{item.sourceName}</span>
              <span>{item.content_type}</span>
              {item.duration_seconds != null && <span>{formatDuration(item.duration_seconds)}</span>}
              <span>{formatDate(item.published_at)}</span>
            </div>
            <h3 className="font-semibold text-sm leading-tight">{item.title}</h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-20">Kategoria:</span>
            <select
              value={selectedCategoryId ?? ""}
              onChange={(e) => { setSelectedCategoryId(e.target.value ? Number(e.target.value) : null); setDirty(true); }}
              className="text-xs bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-white"
            >
              <option value="">-- brak --</option>
              {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-20">Format:</span>
            <select
              value={selectedShowId ?? ""}
              onChange={(e) => { setSelectedShowId(e.target.value ? Number(e.target.value) : null); setDirty(true); }}
              className="text-xs bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-white"
            >
              <option value="">-- brak --</option>
              {shows.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
          </div>

          {/* Person tags */}
          <div>
            <span className="text-xs text-gray-500 block mb-1">Standuperzy:</span>
            <div className="flex flex-wrap gap-1">
              {personTags.map((pt) => (
                <button
                  key={pt.id}
                  onClick={() => toggleTag(pt.id)}
                  className={selectedTagIds.includes(pt.id)
                    ? "text-xs px-2 py-0.5 rounded-full bg-white text-black"
                    : "text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-gray-400 hover:bg-neutral-700"}
                >
                  {pt.name}
                </button>
              ))}
            </div>
          </div>

          {/* Content tags */}
          <div>
            <span className="text-xs text-gray-500 block mb-1">Tagi:</span>
            {Array.from(tagsByType.entries()).map(([type, tags]) => (
              <div key={type} className="mb-1">
                <span className="text-xs text-gray-600 mr-1">{tagTypeLabels[type] || type}:</span>
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={selectedTagIds.includes(tag.id)
                      ? "text-xs px-2 py-0.5 rounded-full bg-emerald-700 text-white mr-1 mb-1"
                      : "text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-gray-400 hover:bg-neutral-700 mr-1 mb-1"}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            ))}

            {/* Dodaj nowy tag */}
            {!showNewTag ? (
              <button
                onClick={() => setShowNewTag(true)}
                className="text-xs px-2 py-0.5 rounded-full bg-green-900 text-green-300 hover:bg-green-800 mt-1"
              >
                + Nowy tag
              </button>
            ) : (
              <div className="mt-2 p-2 bg-neutral-950 border border-neutral-700 rounded-lg">
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Nazwa tagu, np. specjal"
                    className="flex-1 px-2 py-1 bg-neutral-900 border border-neutral-700 rounded text-xs text-white placeholder-gray-500 focus:outline-none"
                  />
                  <select
                    value={newTagType}
                    onChange={(e) => setNewTagType(e.target.value)}
                    className="px-2 py-1 bg-neutral-900 border border-neutral-700 rounded text-xs text-white"
                  >
                    <option value="format">Format</option>
                    <option value="topic">Temat</option>
                    <option value="event">Wydarzenie</option>
                  </select>
                </div>
                {newTagError && <p className="text-xs text-red-400 mb-1">{newTagError}</p>}
                <div className="flex gap-2">
                  <button onClick={handleCreateTag} className="text-xs px-3 py-1 bg-green-800 hover:bg-green-700 rounded text-white">Dodaj</button>
                  <button onClick={() => { setShowNewTag(false); setNewTagError(""); }} className="text-xs px-3 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-gray-300">Anuluj</button>
                </div>
              </div>
            )}
          </div>

          {/* Akcje */}
          <div className="flex items-center gap-2 pt-2 border-t border-neutral-800">
            {mode === "pending" && (
              <>
                <button onClick={handleApprove} className="text-xs px-4 py-1.5 bg-green-800 hover:bg-green-700 rounded font-medium text-white">Zatwierdz</button>
                <button onClick={handleReject} className="text-xs px-4 py-1.5 bg-red-900 hover:bg-red-800 rounded font-medium text-white">Odrzuc</button>
              </>
            )}
            {mode === "approved" && (
              <>
                {dirty && <button onClick={handleSave} className="text-xs px-4 py-1.5 bg-blue-800 hover:bg-blue-700 rounded font-medium text-white">Zapisz zmiany</button>}
                <button
                  onClick={() => {
                    const newVal = !featured;
                    setFeatured(newVal);
                    startTransition(async () => {
                      await toggleFeatured(item.id, newVal);
                    });
                  }}
                  className={featured
                    ? "text-xs px-4 py-1.5 bg-amber-700 hover:bg-amber-600 rounded font-medium text-white"
                    : "text-xs px-4 py-1.5 bg-neutral-700 hover:bg-neutral-600 rounded font-medium text-gray-300"}
                >
                  {featured ? "Wyroznienie ✓" : "Wyroznij"}
                </button>
                <button onClick={handleRevert} className="text-xs px-4 py-1.5 bg-yellow-800 hover:bg-yellow-700 rounded font-medium text-white">Cofnij do pending</button>
                <button onClick={handleReject} className="text-xs px-4 py-1.5 bg-red-900 hover:bg-red-800 rounded font-medium text-white">Odrzuc</button>
              </>
            )}
            {mode === "rejected" && (
              <>
                <button onClick={handleRevert} className="text-xs px-4 py-1.5 bg-yellow-800 hover:bg-yellow-700 rounded font-medium text-white">Cofnij do pending</button>
                <button onClick={handleApprove} className="text-xs px-4 py-1.5 bg-green-800 hover:bg-green-700 rounded font-medium text-white">Zatwierdz</button>
              </>
            )}
            <Link
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded text-gray-300 ml-auto"
            >
              Otworz
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
