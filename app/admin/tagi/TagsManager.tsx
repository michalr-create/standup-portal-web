"use client";

import { useState, useTransition } from "react";
import { deleteTag } from "../actions-sources";

type Tag = { id: number; name: string; slug: string; tag_type: string; usageCount: number };

const typeLabels: Record<string, string> = {
  topic: "Temat",
  format: "Format",
  event: "Wydarzenie",
};

function TagRow({ tag, onDeleted }: { tag: Tag; onDeleted: (id: number) => void }) {
  const [confirm, setConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteTag(tag.id);
      if (result.error) {
        alert(result.error);
      } else {
        onDeleted(tag.id);
      }
    });
  };

  return (
    <div className={`flex items-center justify-between py-2 px-3 rounded-lg ${isPending ? "opacity-40" : "hover:bg-neutral-800"}`}>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-white">{tag.name}</span>
        <span className="text-xs text-gray-500 font-mono">{tag.slug}</span>
        <span className="text-xs text-gray-600">
          {tag.usageCount === 0 ? "nieużywany" : `${tag.usageCount} ${tag.usageCount === 1 ? "wpis" : "wpisów"}`}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {!confirm ? (
          <button
            onClick={() => setConfirm(true)}
            className="text-xs px-2 py-1 bg-neutral-700 hover:bg-red-900 text-gray-400 hover:text-white rounded transition-colors"
          >
            Usu&#324;
          </button>
        ) : (
          <>
            <span className="text-xs text-red-400">Na pewno?</span>
            <button
              onClick={handleDelete}
              className="text-xs px-2 py-1 bg-red-800 hover:bg-red-700 text-white rounded"
            >
              Tak
            </button>
            <button
              onClick={() => setConfirm(false)}
              className="text-xs px-2 py-1 bg-neutral-700 hover:bg-neutral-600 text-gray-300 rounded"
            >
              Nie
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function TagsManager({ tags: initialTags }: { tags: Tag[] }) {
  const [tags, setTags] = useState(initialTags);

  const handleDeleted = (id: number) => setTags((prev) => prev.filter((t) => t.id !== id));

  const grouped = new Map<string, Tag[]>();
  for (const tag of tags) {
    if (!grouped.has(tag.tag_type)) grouped.set(tag.tag_type, []);
    grouped.get(tag.tag_type)!.push(tag);
  }

  if (tags.length === 0) {
    return <p className="text-gray-500 text-sm">Brak tag&oacute;w.</p>;
  }

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([type, typeTags]) => (
        <div key={type}>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
            {typeLabels[type] || type}
          </h2>
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl divide-y divide-neutral-800">
            {typeTags.map((tag) => (
              <TagRow key={tag.id} tag={tag} onDeleted={handleDeleted} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
