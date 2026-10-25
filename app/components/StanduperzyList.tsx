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

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: "var(--paper-mute)" }}>
          <p>{"Nie znaleziono standuper\u00f3w pasuj\u0105cych do \u201e"}{search}{"\u201d"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((person) => (
            <div
              key={person.id}
              className="group flex items-center gap-2 rounded-2xl py-2 pl-4 pr-2 transition-all hover:bg-[var(--ink-3)]"
              style={{ border: "1px solid var(--line)" }}
            >
              <Link
                href={"/standuper/" + person.slug}
                className="flex min-w-0 flex-1 items-center gap-4 py-2"
              >
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

                <span className="ml-auto text-sm" style={{ color: "var(--paper-mute)" }}>
                  {"\u2192"}
                </span>
              </Link>
              <HeartButton type="person" slug={person.slug} name={person.name} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
