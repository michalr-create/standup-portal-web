"use client";

import { useState, useTransition } from "react";
import { createPerson } from "../actions-sources";

type Person = {
  id: number;
  name: string;
  slug: string;
  role: string | null;
  is_active: boolean;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function StanduperzyManager({ people }: { people: Person[] }) {
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [role, setRole] = useState("standuper");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleNameChange = (value: string) => {
    setName(value);
    setSlug(slugify(value));
  };

  const handleSubmit = () => {
    if (!name.trim() || !slug.trim()) {
      setError("Imie i nazwisko oraz slug sa wymagane");
      return;
    }

    startTransition(async () => {
      const result = await createPerson({
        name: name.trim(),
        slug: slug.trim(),
        role,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(`Dodano: ${name.trim()}`);
        setName("");
        setSlug("");
        setError("");
        setTimeout(() => {
          setSuccess("");
          setShowForm(false);
          window.location.reload();
        }, 1500);
      }
    });
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => setShowForm(!showForm)}
        className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-gray-200"
      >
        {showForm ? "Anuluj" : "+ Dodaj standupera"}
      </button>

      {showForm && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-lg">Nowy standuper</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Imie i nazwisko</label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="np. Mateusz Socha"
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-neutral-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Slug (auto-generowany)</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="mateusz-socha"
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-neutral-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Rola</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-sm"
            >
              <option value="standuper">Standuper</option>
              <option value="podcaster">Podcaster</option>
              <option value="host">Prowadzacy</option>
              <option value="aktor">Aktor</option>
            </select>
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-950/50 border border-red-900 rounded-lg px-3 py-2">{error}</div>
          )}
          {success && (
            <div className="text-sm text-green-400 bg-green-950/50 border border-green-900 rounded-lg px-3 py-2">{success}</div>
          )}

          <button
            onClick={handleSubmit}
            disabled={isPending || !name.trim() || !slug.trim()}
            className="px-6 py-2 bg-green-800 hover:bg-green-700 rounded-lg text-sm font-medium text-white disabled:opacity-50"
          >
            {isPending ? "Dodaje..." : "Dodaj standupera"}
          </button>
        </div>
      )}

      {/* Lista */}
      <div className="space-y-2">
        {people.map((p) => (
          <div
            key={p.id}
            className={`bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 flex items-center justify-between ${
              p.is_active ? "" : "opacity-50"
            }`}
          >
            <div>
              <span className="font-medium text-sm">{p.name}</span>
              <span className="text-xs text-gray-500 ml-2">/{p.slug}</span>
              {p.role && <span className="text-xs text-gray-500 ml-2">({p.role})</span>}
            </div>
            {!p.is_active && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-900 text-red-300">nieaktywny</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
