"use client";

import { useMemo } from "react";
import { useLibrary } from "@/app/components/LibraryProvider";

export function useWatchHistory() {
  const library = useLibrary();
  const watched = useMemo(() => new Set(library.watched), [library.watched]);
  return { watched, markWatched: library.markWatched };
}
