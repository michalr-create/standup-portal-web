"use client";

import { useLibrary } from "./LibraryProvider";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]";

export default function WatchLaterButton({
  itemId,
  title,
}: {
  itemId: number;
  title: string;
}) {
  const library = useLibrary();
  const on = library.later.includes(itemId);
  const label = on
    ? `Usuń „${title}” z listy Do obejrzenia`
    : `Dodaj „${title}” do listy Do obejrzenia`;

  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      className={`inline-flex min-h-11 max-w-full items-center rounded-full px-3 text-left text-sm font-bold ${focusRing}`}
      style={
        on
          ? { color: "var(--ink)", background: "var(--coral)" }
          : { color: "var(--paper)", background: "transparent", border: "1px solid var(--line-2)" }
      }
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        library.toggleWatchLater(itemId);
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {on ? "Usuń z listy Do obejrzenia" : "Do obejrzenia"}
    </button>
  );
}
