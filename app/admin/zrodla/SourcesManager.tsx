"use client";

import { useState, useTransition } from "react";
import { createSource, toggleSourceActive, updateSourceDefaultPeople, updateSource, createPerson } from "../actions-sources";
import { quickFetchSource, fullFetchSource, backfillDurations } from "../actions-fetch";

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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function QuickAddPerson({ onAdded }: { onAdded: (person: { id: number; name: string; slug: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleNameChange = (value: string) => {
    setName(value);
    setSlug(slugify(value));
  };

  const handleAdd = () => {
    if (!name.trim() || !slug.trim()) return;
    startTransition(async () => {
      const result = await createPerson({ name: name.trim(), slug: slug.trim(), role: "standuper" });
      if (result.error) {
        setError(result.error);
      } else if (result.person) {
        onAdded(result.person);
        setName("");
        setSlug("");
        setOpen(false);
        setError("");
      }
    });
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-2 py-0.5 rounded-full bg-green-900 text-green-300 hover:bg-green-800"
      >
        + Nowy standuper
      </button>
    );
  }

  return (
    <div className="mt-2 p-3 bg-neutral-950 border border-neutral-700 rounded-lg space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Imie i nazwisko"
          className="flex-1 px-2 py-1 bg-neutral-900 border border-neutral-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none"
        />
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="slug"
          className="w-36 px-2 py-1 bg-neutral-900 border border-neutral-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none"
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleAdd}
          disabled={isPending || !name.trim()}
          className="text-xs px-3 py-1 bg-green-800 hover:bg-green-700 rounded text-white disabled:opacity-50"
        >
          {isPending ? "Dodaje..." : "Dodaj"}
        </button>
        <button
          onClick={() => { setOpen(false); setError(""); }}
          className="text-xs px-3 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-gray-300"
        >
          Anuluj
        </button>
      </div>
    </div>
  );
}

function SourceCard({
  source,
  people,
  shows,
}: {
  source: Source;
  people: { id: number; name: string; slug: string }[];
  shows: { id: number; name: string; slug: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [selectedPeople, setSelectedPeople] = useState<number[]>(source.defaultPersonIds);
  const [selectedShowId, setSelectedShowId] = useState<number | null>(source.show_id);
  const [localPeople, setLocalPeople] = useState(people);
  const [dirty, setDirty] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchResult, setFetchResult] = useState("");
  const [fullImporting, setFullImporting] = useState(false);
  const [fullImportProgress, setFullImportProgress] = useState(0);

  const togglePerson = (personId: number) => {
    setSelectedPeople((prev) =>
      prev.includes(personId) ? prev.filter((id) => id !== personId) : [...prev, personId]
    );
    setDirty(true);
  };

  const handleSave = () => {
    startTransition(async () => {
      await updateSourceDefaultPeople(source.id, selectedPeople);
      if (selectedShowId !== source.show_id) {
        await updateSource(source.id, { show_id: selectedShowId });
      }
      setDirty(false);
      setEditing(false);
      window.location.reload();
    });
  };

  const handleToggle = () => {
    startTransition(async () => {
      await toggleSourceActive(source.id, !source.is_active);
      window.location.reload();
    });
  };

  const handlePersonAdded = (person: { id: number; name: string; slug: string }) => {
    setLocalPeople((prev) => [...prev, person].sort((a, b) => a.name.localeCompare(b.name)));
    setSelectedPeople((prev) => [...prev, person.id]);
    setDirty(true);
  };

  return (
    <div className={`bg-neutral-900 border rounded-xl p-4 ${source.is_active ? "border-neutral-800" : "border-neutral-800 opacity-50"} ${isPending ? "opacity-50 pointer-events-none" : ""}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{source.name}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-gray-400">{source.type}</span>
            {source.is_watch_source && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900 text-yellow-300">watch</span>
            )}
            {!source.is_active && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-900 text-red-300">nieaktywne</span>
            )}
          </div>
          <div className="text-xs text-gray-500 space-x-3">
            <span>{source.itemCount} wpisow</span>
            {source.showName && <span>Format: {source.showName}</span>}
            {source.last_checked_at && (
              <span>Sprawdzono: {new Date(source.last_checked_at).toLocaleDateString("pl-PL")}</span>
            )}
          </div>
          {source.defaultPersonIds.length > 0 && !editing && (
            <div className="text-xs text-gray-500">
              Auto-tag: {people.filter((p) => source.defaultPersonIds.includes(p.id)).map((p) => p.name).join(", ")}
            </div>
          )}
        </div>

        <div className="flex gap-2 shrink-0 flex-wrap">
          {source.type === "youtube" && source.feed_url && (
            <>
              <button
                onClick={async () => {
                  setFetching(true); setFetchResult("");
                  const r = await quickFetchSource(source.id);
                  setFetching(false);
                  setFetchResult(r.error ? `Blad: ${r.error}` : `Dodano ${r.inserted} nowych (z ${r.total} w RSS)`);
                  if (!r.error) setTimeout(() => window.location.reload(), 2000);
                }}
                disabled={fetching || fullImporting}
                className="text-xs px-3 py-1 bg-blue-900 hover:bg-blue-800 rounded text-blue-200 disabled:opacity-50"
              >
                {fetching ? "Pobieram..." : "Pobierz (RSS)"}
              </button>
              <button
                onClick={async () => {
                  setFullImporting(true); setFullImportProgress(0); setFetchResult("");
                  let total = 0;
                  let token: string | null = null;
                  let hasMore = true;
                  let errorMsg = "";
                  while (hasMore) {
                    const r = await fullFetchSource(source.id, token);
                    if (r.error) { errorMsg = r.error; break; }
                    total += r.inserted;
                    setFullImportProgress(total);
                    hasMore = r.hasMore;
                    token = r.nextPageToken;
                  }
                  setFullImporting(false);
                  setFetchResult(errorMsg ? `Blad: ${errorMsg} (dodano ${total})` : `Import ukonczony. Dodano ${total} filmow.`);
                  if (!errorMsg) setTimeout(() => window.location.reload(), 2000);
                }}
                disabled={fetching || fullImporting}
                className="text-xs px-3 py-1 bg-purple-900 hover:bg-purple-800 rounded text-purple-200 disabled:opacity-50"
              >
                {fullImporting ? `Import... (${fullImportProgress})` : "Pelny import (API)"}
              </button>
          <button
                onClick={async () => {
                  setFetching(true); setFetchResult("");
                  const r = await backfillDurations(source.id);
                  setFetching(false);
                  setFetchResult(r.error ? `Blad: ${r.error}` : `Uzupelniono duration dla ${r.updated} filmow`);
                  if (!r.error && r.updated > 0) setTimeout(() => window.location.reload(), 2000);
                }}
                disabled={fetching || fullImporting}
                className="text-xs px-3 py-1 bg-neutral-700 hover:bg-neutral-600 rounded text-gray-300 disabled:opacity-50"
              >
                {fetching ? "..." : "Uzupelnij czas"}
              </button>
            </>
          )}
          <button
            onClick={() => setEditing(!editing)}
            className="text-xs px-3 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-gray-300"
          >
            {editing ? "Zamknij" : "Edytuj"}
          </button>
          <button
            onClick={handleToggle}
            className="text-xs px-3 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-gray-300"
          >
            {source.is_active ? "Wylacz" : "Wlacz"}
          </button>
        </div>
      </div>
      {fetchResult && (
        <div className={`mt-3 text-xs px-3 py-2 rounded-lg ${fetchResult.startsWith("Blad") ? "bg-red-950/50 text-red-400 border border-red-900" : "bg-green-950/50 text-green-400 border border-green-900"}`}>
          {fetchResult}
        </div>
      )}
      {editing && (
        <div className="mt-4 pt-4 border-t border-neutral-800 space-y-3">
          {/* Format */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-20">Format:</span>
            <select
              value={selectedShowId ?? ""}
              onChange={(e) => { setSelectedShowId(e.target.value ? Number(e.target.value) : null); setDirty(true); }}
              className="text-xs bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-white"
            >
              <option value="">-- brak --</option>
              {shows.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Domyslni standuperzy */}
          <div>
            <span className="text-xs text-gray-500 block mb-1">Domyslni standuperzy (auto-tag):</span>
            <div className="flex flex-wrap gap-1">
              {localPeople.map((p) => (
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
            <QuickAddPerson onAdded={handlePersonAdded} />
          </div>

          {dirty && (
            <button
              onClick={handleSave}
              className="text-xs px-4 py-1.5 bg-blue-800 hover:bg-blue-700 rounded font-medium text-white"
            >
              Zapisz zmiany
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function SourcesManager({ sources, people, shows }: Props) {
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [localPeople, setLocalPeople] = useState(people);

  // New source form state
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

    const finalFeedUrl = type === "youtube" ? feedUrl : type === "podcast" ? feedUrl : "";

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

  const togglePerson = (personId: number) => {
    setSelectedPeople((prev) =>
      prev.includes(personId) ? prev.filter((id) => id !== personId) : [...prev, personId]
    );
  };

  const handlePersonAdded = (person: { id: number; name: string; slug: string }) => {
    setLocalPeople((prev) => [...prev, person].sort((a, b) => a.name.localeCompare(b.name)));
    setSelectedPeople((prev) => [...prev, person.id]);
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => setShowForm(!showForm)}
        className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-gray-200"
      >
        {showForm ? "Anuluj" : "+ Dodaj zrodlo"}
      </button>

      {showForm && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-lg">Nowe zrodlo</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Nazwa</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Mateusz Socha YouTube" className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-neutral-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Typ</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-sm">
                <option value="youtube">YouTube</option>
                <option value="podcast">Podcast (RSS)</option>
                <option value="website">Strona www</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">URL kanalu / strony</label>
            <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/@NazwaKanalu" className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-neutral-500" />
          </div>

          {type === "youtube" && (
            <div>
              <label className="block text-sm text-gray-300 mb-1">Channel ID (UC...)<span className="text-gray-500 text-xs ml-2">commentpicker.com/youtube-channel-id.php</span></label>
              <input type="text" value={channelId} onChange={(e) => handleChannelIdChange(e.target.value)} placeholder="UCxxxxxxxxxxxxxxxx" className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-neutral-500" />
              {feedUrl && <p className="text-xs text-green-400 mt-1">Feed URL: {feedUrl}</p>}
            </div>
          )}

          {type === "podcast" && (
            <div>
              <label className="block text-sm text-gray-300 mb-1">RSS Feed URL</label>
              <input type="url" value={feedUrl} onChange={(e) => setFeedUrl(e.target.value)} placeholder="https://anchor.fm/s/.../podcast/rss" className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-neutral-500" />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Powiazany format</label>
              <select value={showId ?? ""} onChange={(e) => setShowId(e.target.value ? Number(e.target.value) : null)} className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-sm">
                <option value="">-- brak --</option>
                {shows.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
              </select>
            </div>
            <div className="flex items-center gap-3 pt-6">
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input type="checkbox" checked={isWatch} onChange={(e) => setIsWatch(e.target.checked)} className="rounded" />
                Watch source
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Domyslni standuperzy (auto-tag):</label>
            <div className="flex flex-wrap gap-1">
              {localPeople.map((p) => (
                <button key={p.id} onClick={() => togglePerson(p.id)} className={selectedPeople.includes(p.id) ? "text-xs px-2 py-0.5 rounded-full bg-white text-black" : "text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-gray-400 hover:bg-neutral-700"}>{p.name}</button>
              ))}
            </div>
            <QuickAddPerson onAdded={handlePersonAdded} />
          </div>

          {error && <div className="text-sm text-red-400 bg-red-950/50 border border-red-900 rounded-lg px-3 py-2">{error}</div>}
          {success && <div className="text-sm text-green-400 bg-green-950/50 border border-green-900 rounded-lg px-3 py-2">{success}</div>}

          <button onClick={handleSubmit} disabled={isPending || !name.trim()} className="px-6 py-2 bg-green-800 hover:bg-green-700 rounded-lg text-sm font-medium text-white disabled:opacity-50">
            {isPending ? "Dodaje..." : "Dodaj zrodlo"}
          </button>
        </div>
      )}

      {/* Lista istniejacych zrodel */}
      <div className="space-y-3">
        {sources.map((s) => (
          <SourceCard key={s.id} source={s} people={localPeople} shows={shows} />
        ))}
      </div>
    </div>
  );
}
