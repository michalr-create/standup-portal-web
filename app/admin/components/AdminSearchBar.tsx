"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminSearchBar({
  defaultValue,
  currentStatus,
}: {
  defaultValue: string;
  currentStatus: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const router = useRouter();

  const submit = (q: string) => {
    const p = new URLSearchParams();
    p.set("status", currentStatus);
    if (q.trim()) p.set("q", q.trim());
    router.push(`/admin?${p.toString()}`);
  };

  return (
    <form
      className="flex gap-2 mb-4"
      onSubmit={(e) => { e.preventDefault(); submit(value); }}
    >
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Szukaj po tytule we wszystkich pozycjach\u2026"
        className="flex-1 px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-neutral-500"
      />
      <button
        type="submit"
        className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 rounded text-sm text-white"
      >
        Szukaj
      </button>
      {defaultValue && (
        <button
          type="button"
          onClick={() => { setValue(""); submit(""); }}
          className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded text-sm text-gray-400"
        >
          {"Wyczy\u015b\u0107 \u00d7"}
        </button>
      )}
    </form>
  );
}
