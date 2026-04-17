"use client";

import { useState, useTransition } from "react";
import { createSource, toggleSourceActive } from "../actions-sources";

type Source = {
  id: number;
  name: string;
  type: string;
  url: string;
  feed_url: string | null;
  is_active: boolean;
  is_watch_source: boolean;
  show_id: number | null;
  showName: string | null;
  itemCount: number;
  last_checked_at: string | null;
  defaultPersonIds: number[];
};

type Props = {
  sources: Source[];
  people: { id: number; name: string; slug: string }[];
  shows: { id: number; name: string; slug: string }[];
};

export default function SourcesManager({ sources, people, shows }: Props) {
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState("youtube");
  const [url, setUrl] = useState("");
  const [channelId, setChannelId] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [showId, setShowId] = useState<number | null>(null);
  const [isWatch, setIsWatch] = useState(false);
  const [selectedPeople, setSelectedPeople] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChannelIdChange = (value: string) => {
    setChannelId(value);
    if (value.startsWith("UC") && value.length >= 20) {
      setFeedUrl(`https://www.youtube.com/feeds/videos.xml?channel_id=${value}`);
    }
  };

  const handleSubmit = () => {
    if (!name.trim()) { setError("Nazwa jest wymagana"); return; }

    const finalFeedUrl = type === "youtube"
      ? feedUrl
      : type === "podcast"
      ? feedUrl
      : "";

    startTransition(async () => {
      const result = await createSource({
        name: name.trim(),
        type,
        url: url.trim(),
        feed_url: finalFeedUrl.trim(),
        show_id: showId,
        is_watch_source: isWatch,
        default_person_ids: selectedPeople,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess("Zrodlo dodane!");
        setName(""); setUrl(""); setChannelId(""); setFeedUrl("");
        setShowId(null); setIsWatch(false); setSelectedPeople([]);
        setTimeout(() => { setSuccess(""); setShowForm(false); window.location.reload(); }, 1500);
      }
    });
  };

  const handleToggle = (sourceId: number, currentActive: boolean) => {
    startTransition(async () => {
      await toggleSourceActive(sourceId, !currentActive);
      window.location.reload();
    });
  };

  const togglePerson = (personId: number) => {
    setSelectedPeople((prev) =>
      prev.includes(personId) ? prev.filter((id) => id !== personId) : [...prev, personId]
    );
  };

  return (
    <div className="space-y-6">
      {/* Przycisk dodawania */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-gray-200"
      >
        {showForm ? "Anuluj" : "+ Dodaj zrodlo"}
      </button>

      {/* Formularz dodawania */}
      {showForm && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-lg">Nowe zrodlo</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Nazwa</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="np. Wahanie YouTube"
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-neutral-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">Typ</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-sm"
              >
                <option value="youtube">YouTube</option>
                <option value="podcast">Podcast (RSS)</option>
                <option value="website">Strona www</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">URL kanalu / strony</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/@NazwaKanalu"
              className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-neutral-500"
            />
          </div>

          {type === "youtube" && (
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Channel ID (zaczyna sie od UC...)
                <span className="text-gray-500 text-xs ml-2">
                  Znajdz na commentpicker.com/youtube-channel-id.php
                </span>
              </label>
              <input
                type="text"
                value={channelId}
                onChange={(e) => handleChannelIdChange(e.target.value)}
                placeholder="UCxxxxxxxxxxxxxxxx"
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-neutral-500"
              />
              {feedUrl && (
                <p className="text-xs text-green-400 mt-1">Feed URL: {feedUrl}</p>
              )}
            </div>
          )}

          {type === "podcast" && (
            <div>
              <label className="block text-sm text-gray-300 mb-1">RSS Feed URL</label>
              <input
                type="url"
                value={feedUrl}
                onChange={(e) => setFeedUrl(e.target.value)}
                placeholder="https://anchor.fm/s/.../podcast/rss"
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-neutral-500"
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Powiazany format (opcjonalnie)</label>
              <select
                value={showId ?? ""}
                onChange={(e) => setShowId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-sm"
              >
                <option value="">-- brak --</option>
                {shows.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 pt-6">
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isWatch}
                  onChange={(e) => setIsWatch(e.target.checked)}
                  className="rounded"
                />
                Watch source (tylko skanuj, nie dodawaj automatycznie)
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Domyslni standuperzy (auto-tagowani przy kazdym wpisie):</label>
            <div className="flex flex-wrap gap-1">
              {people.map((p) => (
                <button
                  key={p.id}
                  onClick={() => togglePerson(p.id)}
                  className={
                    selectedPeople.includes(p.id)
                      ? "text-xs px-2 py-0.5 rounded-full bg-white text-black"
                      : "text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-gray-400 hover:bg-neutral-700"
                  }
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-950/50 border border-red-900 rounded-lg px-3 py-2">{error}</div>
          )}
          {success && (
            <div className="text-sm text-green-400 bg-green-950/50 border border-green-900 rounded-lg px-3 py-2">{success}</div>
          )}

          <button
            onClick={handleSubmit}
            disabled={isPending || !name.trim()}
            className="px-6 py-2 bg-green-800 hover:bg-green-700 rounded-lg text-sm font-medium text-white disabled:opacity-50"
          >
            {isPending ? "Dodaje..." : "Dodaj zrodlo"}
          </button>
        </div>
      )}

      {/* Lista istniejacych zrodel */}
      <div className="space-y-3">
        {sources.map((s) => (
          <div
            key={s.id}
            className={`bg-neutral-900 border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              s.is_active ? "border-neutral-800" : "border-neutral-800 opacity-50"
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{s.name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-gray-400">{s.type}</span>
                {s.is_watch_source && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900 text-yellow-300">watch</span>
                )}
                {!s.is_active && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-900 text-red-300">nieaktywne</span>
                )}
              </div>
              <div className="text-xs text-gray-500 space-x-3">
                <span>{s.itemCount} wpisow</span>
                {s.showName && <span>Format: {s.showName}</span>}
                {s.last_checked_at && (
                  <span>Sprawdzono: {new Date(s.last_checked_at).toLocaleDateString("pl-PL")}</span>
                )}
              </div>
              {s.defaultPersonIds.length > 0 && (
                <div className="text-xs text-gray-500">
                  Auto-tag: {people.filter((p) => s.defaultPersonIds.includes(p.id)).map((p) => p.name).join(", ")}
                </div>
              )}
            </div>

            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => handleToggle(s.id, s.is_active)}
                disabled={isPending}
                className="text-xs px-3 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-gray-300"
              >
                {s.is_active ? "Wylacz" : "Wlacz"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
