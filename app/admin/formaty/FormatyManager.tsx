"use client";

import { useState, useTransition } from "react";
import { createShow, updateShow, updateShowDefaultPeople, deleteShow } from "../actions-sources";

type Show = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  category_id: number | null;
  categoryName: string | null;
  youtube_channel_url: string | null;
  spotify_show_url: string | null;
  apple_podcasts_url: string | null;
  website_url: string | null;
  is_active: boolean;
  itemCount: number;
  defaultPersonIds: number[];
};

type Category = { id: number; name: string; slug: string };
type Person = { id: number; name: string; slug: string };

type Props = {
  shows: Show[];
  categories: Category[];
  people: Person[];
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function ShowCard({ show, categories, people }: { show: Show; categories: Category[]; people: Person[] }) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [description, setDescription] = useState(show.description || "");
  const [categoryId, setCategoryId] = useState<number | null>(show.category_id);
  const [youtubeUrl, setYoutubeUrl] = useState(show.youtube_channel_url || "");
  const [spotifyUrl, setSpotifyUrl] = useState(show.spotify_show_url || "");
  const [appleUrl, setAppleUrl] = useState(show.apple_podcasts_url || "");
  const [websiteUrl, setWebsiteUrl] = useState(show.website_url || "");
  const [selectedPeople, setSelectedPeople] = useState<number[]>(show.defaultPersonIds);
  const [dirty, setDirty] = useState(false);

  const togglePerson = (pid: number) => {
    setSelectedPeople((prev) => prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid]);
    setDirty(true);
  };

  const handleSave = () => {
    startTransition(async () => {
      await updateShow(show.id, {
        description,
        category_id: categoryId,
        youtube_channel_url: youtubeUrl,
        spotify_show_url: spotifyUrl,
        apple_podcasts_url: appleUrl,
        website_url: websiteUrl,
      });
      await updateShowDefaultPeople(show.id, selectedPeople);
      setDirty(false);
      setEditing(false);
      window.location.reload();
    });
  };

  const handleToggleActive = () => {
    startTransition(async () => {
      await updateShow(show.id, { is_active: !show.is_active });
      window.location.reload();
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteShow(show.id);
      if (result.error) {
        setDeleteError(`Błąd: ${result.error}`);
        setConfirmDelete(false);
      } else {
        window.location.reload();
      }
    });
  };

  return (
    <div className={`bg-neutral-900 border border-neutral-800 rounded-xl p-4 ${show.is_active ? "" : "opacity-50"} ${isPending ? "opacity-50 pointer-events-none" : ""}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{show.name}</span>
            <span className="text-xs text-gray-500">/{show.slug}</span>
            {show.categoryName && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-gray-400">{show.categoryName}</span>
            )}
            {!show.is_active && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-900 text-red-300">nieaktywny</span>
            )}
          </div>
          <div className="text-xs text-gray-500 space-x-3">
            <span>{show.itemCount} wpisow</span>
            {show.description && !editing && (
              <span className="text-gray-600">{show.description.slice(0, 80)}{show.description.length > 80 ? "..." : ""}</span>
            )}
          </div>
          {show.defaultPersonIds.length > 0 && !editing && (
            <div className="text-xs text-gray-500">
              Auto-tag: {people.filter((p) => show.defaultPersonIds.includes(p.id)).map((p) => p.name).join(", ")}
            </div>
          )}
          {!editing && (show.youtube_channel_url || show.spotify_show_url || show.apple_podcasts_url) && (
            <div className="flex gap-2 text-xs text-gray-500">
              {show.youtube_channel_url && <span>YT</span>}
              {show.spotify_show_url && <span>Spotify</span>}
              {show.apple_podcasts_url && <span>Apple</span>}
              {show.website_url && <span>WWW</span>}
            </div>
          )}
        </div>

        <div className="flex gap-2 shrink-0 flex-wrap">
          <button
            onClick={() => setEditing(!editing)}
            className="text-xs px-3 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-gray-300"
          >
            {editing ? "Zamknij" : "Edytuj"}
          </button>
          <button
            onClick={handleToggleActive}
            className="text-xs px-3 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-gray-300"
          >
            {show.is_active ? "Wylacz" : "Wlacz"}
          </button>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs px-3 py-1 bg-neutral-800 hover:bg-red-900 rounded text-gray-400 hover:text-red-300"
            >
              Usuń
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="text-xs px-3 py-1 bg-red-900 hover:bg-red-800 rounded text-red-200 disabled:opacity-50"
              >
                {isPending ? "Usuwam…" : "Potwierdź"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs px-2 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-gray-400"
              >
                Anuluj
              </button>
            </div>
          )}
        </div>
      </div>

      {deleteError && (
        <div className="mt-3 text-xs px-3 py-2 rounded-lg bg-red-950/50 text-red-400 border border-red-900">
          {deleteError}
        </div>
      )}
      {editing && (
        <div className="mt-4 pt-4 border-t border-neutral-800 space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Opis</label>
            <textarea
              value={description}
              onChange={(e) => { setDescription(e.target.value); setDirty(true); }}
              rows={2}
              className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-neutral-500 resize-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-24">Kategoria:</span>
            <select
              value={categoryId ?? ""}
              onChange={(e) => { setCategoryId(e.target.value ? Number(e.target.value) : null); setDirty(true); }}
              className="text-xs bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-white"
            >
              <option value="">-- brak --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">YouTube kanalu</label>
              <input type="url" value={youtubeUrl} onChange={(e) => { setYoutubeUrl(e.target.value); setDirty(true); }} placeholder="https://youtube.com/..." className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-white text-xs placeholder-gray-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Spotify</label>
              <input type="url" value={spotifyUrl} onChange={(e) => { setSpotifyUrl(e.target.value); setDirty(true); }} placeholder="https://open.spotify.com/show/..." className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-white text-xs placeholder-gray-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Apple Podcasts</label>
              <input type="url" value={appleUrl} onChange={(e) => { setAppleUrl(e.target.value); setDirty(true); }} placeholder="https://podcasts.apple.com/..." className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-white text-xs placeholder-gray-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Strona www</label>
              <input type="url" value={websiteUrl} onChange={(e) => { setWebsiteUrl(e.target.value); setDirty(true); }} placeholder="https://..." className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-white text-xs placeholder-gray-500 focus:outline-none" />
            </div>
          </div>

          <div>
            <span className="text-xs text-gray-500 block mb-1">Domyslni standuperzy (auto-tag):</span>
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

export default function FormatyManager({ shows, categories, people }: Props) {
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [appleUrl, setAppleUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [selectedPeople, setSelectedPeople] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleNameChange = (value: string) => {
    setName(value);
    setSlug(slugify(value));
  };

  const togglePerson = (pid: number) => {
    setSelectedPeople((prev) => prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid]);
  };

  const handleSubmit = () => {
    if (!name.trim() || !slug.trim()) {
      setError("Nazwa i slug sa wymagane");
      return;
    }

    startTransition(async () => {
      const result = await createShow({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        category_id: categoryId,
        youtube_channel_url: youtubeUrl.trim(),
        spotify_show_url: spotifyUrl.trim(),
        apple_podcasts_url: appleUrl.trim(),
        website_url: websiteUrl.trim(),
        default_person_ids: selectedPeople,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(`Dodano: ${name.trim()}`);
        setName(""); setSlug(""); setDescription("");
        setCategoryId(null); setYoutubeUrl(""); setSpotifyUrl("");
        setAppleUrl(""); setWebsiteUrl(""); setSelectedPeople([]); setError("");
        setTimeout(() => { setSuccess(""); setShowForm(false); window.location.reload(); }, 1500);
      }
    });
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => setShowForm(!showForm)}
        className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-gray-200"
      >
        {showForm ? "Anuluj" : "+ Dodaj format"}
      </button>

      {showForm && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-lg">Nowy format</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Nazwa</label>
              <input type="text" value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="np. Wahanie" className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-neutral-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Slug (auto)</label>
              <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="wahanie" className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-neutral-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Opis</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Krotki opis formatu..." className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-neutral-500 resize-none" />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Kategoria</label>
            <select value={categoryId ?? ""} onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-sm">
              <option value="">-- brak --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-gray-300 mb-1">YouTube kanalu</label>
              <input type="url" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/..." className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-neutral-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Spotify</label>
              <input type="url" value={spotifyUrl} onChange={(e) => setSpotifyUrl(e.target.value)} placeholder="https://open.spotify.com/show/..." className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-neutral-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Apple Podcasts</label>
              <input type="url" value={appleUrl} onChange={(e) => setAppleUrl(e.target.value)} placeholder="https://podcasts.apple.com/..." className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-neutral-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Strona www</label>
              <input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-neutral-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Domyslni standuperzy (auto-tag)</label>
            <div className="flex flex-wrap gap-1">
              {people.map((p) => (
                <button key={p.id} onClick={() => togglePerson(p.id)} className={selectedPeople.includes(p.id) ? "text-xs px-2 py-0.5 rounded-full bg-white text-black" : "text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-gray-400 hover:bg-neutral-700"}>
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="text-sm text-red-400 bg-red-950/50 border border-red-900 rounded-lg px-3 py-2">{error}</div>}
          {success && <div className="text-sm text-green-400 bg-green-950/50 border border-green-900 rounded-lg px-3 py-2">{success}</div>}

          <button onClick={handleSubmit} disabled={isPending || !name.trim()} className="px-6 py-2 bg-green-800 hover:bg-green-700 rounded-lg text-sm font-medium text-white disabled:opacity-50">
            {isPending ? "Dodaje..." : "Dodaj format"}
          </button>
        </div>
      )}

      {/* Lista */}
      <div className="space-y-3">
        {shows.map((s) => (
          <ShowCard key={s.id} show={s} categories={categories} people={people} />
        ))}
      </div>
    </div>
  );
}
