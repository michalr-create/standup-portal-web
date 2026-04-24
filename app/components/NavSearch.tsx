"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function NavSearch() {
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = q.trim();
    if (trimmed) {
      router.push(`/szukaj?q=${encodeURIComponent(trimmed)}`);
      setQ("");
      inputRef.current?.blur();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200"
      style={{
        background: focused ? "var(--ink-3)" : "transparent",
        border: "1px solid",
        borderColor: focused ? "var(--paper-mute)" : "var(--line)",
        width: focused ? "200px" : "140px",
      }}
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ color: "var(--paper-mute)", flexShrink: 0 }}
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        ref={inputRef}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Szukaj..."
        className="bg-transparent outline-none w-full text-sm placeholder:opacity-50"
        style={{ color: "var(--paper)" }}
      />
    </form>
  );
}
