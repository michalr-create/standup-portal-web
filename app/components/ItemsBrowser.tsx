"use client";

import Link from "next/link";
import type { Item } from "@/lib/data";

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "";
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function timeAgo(dateString: string | null): string {
  if (!dateString) return "";
  const diff = Date.now() - new Date(dateString).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "przed chwil\u0105";
  if (hours < 24) return `${hours} godz temu`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "wczoraj";
  if (days < 7) return `${days} dni temu`;
  try {
    return new Date(dateString).toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

export default function ItemsBrowser({ items }: { items: Item[] }) {
  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4">{"\uD83C\uDFA4"}</div>
        <p style={{ color: "var(--paper-mute)" }}>Brak tre{"\u015b"}ci w tej kategorii.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {items.map((item) => {
        const label = item.people.length > 0
          ? item.people.map((p) => p.name).join(" \u00b7 ")
          : item.showName || "";

        return (
          <Link
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block vcard"
          >
            <div
              className="overflow-hidden relative"
              style={{
                aspectRatio: "16/10",
                borderRadius: "14px",
                border: "1px solid var(--line)",
                background: "var(--ink-3)",
              }}
            >
              {item.thumbnail_url && (
                <img
                  src={item.thumbnail_url}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              )}

              {item.duration_seconds != null && (
                <div
                  className="absolute bottom-2.5 right-2.5 mono px-2 py-1 rounded-md"
                  style={{ background: "rgba(11,11,11,.8)", color: "var(--paper)", fontSize: "11px" }}
                >
                  {formatDuration(item.duration_seconds)}
                </div>
              )}

              <div
                className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold"
                style={{
                  background: "rgba(11,11,11,.75)",
                  backdropFilter: "blur(6px)",
                  color: "var(--paper)",
                  fontSize: "11px",
                }}
              >
                <span
                  className="inline-block w-2 h-2 rounded-sm"
                  style={{ background: "var(--coral)" }}
                />
                {item.categoryName || "YouTube"}
              </div>

              <div className="play-overlay">
                <div className="play-btn" />
              </div>
            </div>

            <div className="pt-3 px-0.5">
              <h4
                className="font-extrabold leading-tight mb-1.5 line-clamp-2"
                style={{ fontSize: "16px", letterSpacing: "-.01em" }}
              >
                {item.title}
              </h4>
              <div
                className="flex items-center gap-2"
                style={{ color: "var(--paper-dim)", fontSize: "13px" }}
              >
                <span>{label}</span>
                {label && <span style={{ color: "var(--paper-mute)" }}>{"\u00b7"}</span>}
                <span className="mono" style={{ color: "var(--paper-mute)", fontSize: "11px" }}>
                  {timeAgo(item.published_at)}
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

