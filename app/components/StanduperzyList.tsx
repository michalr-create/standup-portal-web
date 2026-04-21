"use client";

import { useState } from "react";
import Link from "next/link";
import HeartButton from "./HeartButton";

type Person = {
  id: number;
  name: string;
  slug: string;
  role: string | null;
  bio: string | null;
};

export default function StanduperzyList({ people }: { people: Person[] }) {
  const [search, setSearch] = useState("");

  const filtered = people.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const letters = Array.from(
    new Set(filtered.map((p) => p.name.charAt(0).toUpperCase()))
  ).sort();

  return (
    <div>
      {/* Search */}
      <div className="mb-8">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={"Szukaj standupera\u2026"}
          className="w-full max-w-md px-4 py-3 rounded-full mono text-sm outline-none"
          style={{
            background: "var(--ink-3)",
            border: "1px solid var(--line-2)",
            color: "var(--paper)",
            fontSize: "14px",
          }}
        />
      </div>

      {/* Letter navigation */}
      <div className="flex flex-wrap gap-1 mb-8">
        {letters.map((letter) => (
          <span
            key={letter}
            className="w-8 h-8 rounded-full grid place-items-center text-xs font-bold"
            style={{ background: "var(--ink-3)", color: "var(--paper-dim)" }}
          >
            {letter}
          </span>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: "var(--paper-mute)" }}>
          <p>{"Nie znaleziono standuper\u00f3w pasuj\u0105cych do \u201e"}{search}{"\u201d"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((person) => (
            <Link
              key={person.id}
              href={"/standuper/" + person.slug}
              className="group flex items-center gap-4 p-4 rounded-2xl transition-all hover:bg-[var(--ink-3)]"
              style={{ border: "1px solid var(--line)" }}
            >
              {/* Avatar */}
              <div
                className="w-12 h-12 rounded-full shrink-0 grid place-items-center font-black text-sm"
                style={{
                  background: "linear-gradient(135deg, var(--coral), #F2A65A)",
                  color: "var(--ink)",
                }}
              >
                {person.name.split(" ").map((w) => w.charAt(0)).join("").slice(0, 2)}
              </div>

              <div className="min-w-0">
                <div className="font-bold text-sm group-hover:text-white transition-colors" style={{ color: "var(--paper)" }}>
                  {person.name}
                </div>
                {person.role && (
                  <div className="mono text-xs" style={{ color: "var(--paper-mute)", fontSize: "11px" }}>
                    {person.role}
                  </div>
                )}
              </div>

              <div className="ml-auto flex items-center gap-0.5">
                <HeartButton type="person" slug={person.slug} />
                <span className="text-sm" style={{ color: "var(--paper-mute)" }}>
                  {"\u2192"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
