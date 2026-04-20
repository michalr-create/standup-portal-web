"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "parska_watched";

export function useWatchHistory() {
  const [watched, setWatched] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setWatched(new Set(JSON.parse(stored) as string[]));
    } catch {}
  }, []);

  const markWatched = useCallback((url: string) => {
    setWatched((prev) => {
      const next = new Set(prev);
      next.add(url);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  }, []);

  return { watched, markWatched };
}
