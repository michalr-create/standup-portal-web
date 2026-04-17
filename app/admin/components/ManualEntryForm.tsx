"use client";

import { useState, useTransition } from "react";
import { fetchUrlMetadata, createManualEntry } from "../actions-sources";

type Props = {
  categories: { id: number; name: string }[];
  shows: { id: number; name: string }[];
  personTags: { id: number; name: string }[];
  onClose: () => void;
  onSuccess: () => void;
};

export default function ManualEntryForm({ categories, shows, personTags, onClose, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [showId, setShowId] = useState<number | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [metaFetched, setMetaFetched] = useState(false);
  const [error, setError] = useState("");
  const [fetchingMeta, setFetchingMeta] = useState(false);

  const handleFetchMeta = async () => {
    if (!url.trim()) return;
    setFetchingMeta(true);
    setError("");

    try {
      const meta = await fetchUrlMetadata(url.trim());
      if (meta.title) setTitle(meta.title);
      if (meta.description) setDescription(meta.description);
      if (meta.thumbnail_url) setThumbnailUrl(meta.thumbnail_url);
      setMetaFetched(true);
    } catch (e) {
      setError("Nie udalo sie pobrac metadanych");
    } finally {
      setFetchingMeta(false);
    }
  };

  const handleSave = () => {
    if (!url.trim() || !title.trim()) {
      setError("URL i tytul sa wymagane");
      return;
    }

    startTransition(async () => {
      const result = await createManualEntry({
        url: url.trim(),
        title: title.trim(),
        description: description.trim(),
        thumbnail_url: thumbnailUrl.trim(),
        category_id: categoryId,
        show_id: showId,
        person_tag_ids: selectedTagIds,
        content_type: "",
        published_at: null,
      });

      if (result.error) {
        setError(result.error);
      } else {
        onSuccess();
      }
    });
  };

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-xl p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Dodaj wpis recznie</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        <div className="space-y-4">
          {/* URL + Fetch */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">URL</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setMetaFetched(false); }}
                placeholder="https://www.youtube.com/watch?v=..."
                className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-neutral-500"
              />
              <button
                onClick={handleFetchMeta}
                disabled={!url.trim() || fetchingMeta}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm text-white disabled:opacity-50"
              >
                {fetchingMeta ? "Pobieram..." : "Pobierz dane"}
              </button>
            </div>
          </div>

          {/* Preview miniaturki */}
          {thumbnailUrl && (
            <div className="rounded-lg overflow-hidden bg-neutral-800">
              <img src={thumbnailUrl} alt="Preview" className="w-full max-h-48 object-cover" />
            </div>
          )}

          {/* Tytul */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Tytul</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tytul wpisu"
              className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-neutral-500"
            />
          </div>

          {/* Opis */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Opis (opcjonalny)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Krotki opis..."
              className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-neutral-500 resize-none"
            />
          </div>

          {/* Miniaturka URL */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">URL miniaturki (opcjonalny)</label>
            <input
              type="url"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-neutral-500"
            />
          </div>

          {/* Kategoria */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-300 w-24">Kategoria:</label>
            <select
              value={categoryId ?? ""}
              onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
              className="text-sm bg-neutral-800 border border-neutral-700 rounded px-3 py-1.5 text-white"
            >
              <option value="">-- brak --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Show */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-300 w-24">Format:</label>
            <select
              value={showId ?? ""}
              onChange={(e) => setShowId(e.target.value ? Number(e.target.value) : null)}
              className="text-sm bg-neutral-800 border border-neutral-700 rounded px-3 py-1.5 text-white"
            >
              <option value="">-- brak --</option>
              {shows.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Tagi person */}
          <div>
            <label className="text-sm text-gray-300 block mb-1">Standuperzy:</label>
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

          {/* Blad */}
          {error && (
            <div className="text-sm text-red-400 bg-red-950/50 border border-red-900 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Przyciski */}
          <div className="flex gap-3 pt-4 border-t border-neutral-800">
            <button
              onClick={handleSave}
              disabled={isPending || !url.trim() || !title.trim()}
              className="px-6 py-2 bg-green-800 hover:bg-green-700 rounded-lg text-sm font-medium text-white disabled:opacity-50"
            >
              {isPending ? "Zapisuje..." : "Zapisz i zatwierdz"}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm text-gray-300"
            >
              Anuluj
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
