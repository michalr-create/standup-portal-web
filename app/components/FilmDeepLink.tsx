"use client";

import { useEffect, useRef, useState } from "react";
import type { Item } from "@/lib/data";
import {
  FILM_QUERY,
  FILM_VIDEO_QUERY,
  parseFilmId,
  parseShareVideoId,
  readFilmPayload,
  stubFilmItem,
  withoutFilmQuery,
} from "@/lib/film-link";
import { resolveContentOpen } from "@/lib/youtube";
import { VIDEO_HISTORY_HASH } from "@/lib/video-history";
import VideoModal from "./VideoModal";

const DISMISS_KEY = "parskaFilmDismissed";

type OpenFilm = {
  item: Item;
  videoId: string;
};

function rememberedDismiss(): number | null {
  try {
    return parseFilmId(sessionStorage.getItem(DISMISS_KEY));
  } catch {
    return null;
  }
}

function rememberDismiss(id: number) {
  try {
    sessionStorage.setItem(DISMISS_KEY, String(id));
  } catch {
    // Private mode can reject storage. The ref still covers this document.
  }
}

function clearDismiss() {
  try {
    sessionStorage.removeItem(DISMISS_KEY);
  } catch {
    // Ignore.
  }
}

function forgetFilmParam() {
  const next = withoutFilmQuery(window.location.href);
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next === current) return;
  window.history.replaceState(window.history.state, "", next);
}

function readLocation(): { film: string | null; video: string | null } {
  const next = new URLSearchParams(window.location.search);
  return { film: next.get(FILM_QUERY), video: next.get(FILM_VIDEO_QUERY) };
}

/**
 * `/?film=<id>&v=<youtube id>&zrodlo=push` opens VideoModal on the homepage.
 * The YouTube id is in the URL so the iframe can start before `/api/film`
 * returns, while the notification click can still count as a play gesture.
 * Closing strips those params and leaves the homepage that was behind the player.
 * The in-app Back entry rewinds onto `?film=`; the dismissed id stops a second open.
 * Search params are read from the address bar so the homepage can stay static.
 */
export default function FilmDeepLink() {
  const [search, setSearch] = useState<{ film: string | null; video: string | null }>({ film: null, video: null });
  const [modal, setModal] = useState<OpenFilm | null>(null);
  const dismissedRef = useRef<number | null>(null);
  const requestRef = useRef(0);

  const publishLocation = () => {
    const next = readLocation();
    setSearch((current) => (current.film === next.film && current.video === next.video ? current : next));
  };

  useEffect(() => {
    const sync = () => {
      const id = parseFilmId(new URLSearchParams(window.location.search).get(FILM_QUERY));
      if (id != null && (dismissedRef.current === id || rememberedDismiss() === id)) forgetFilmParam();
      publishLocation();
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  useEffect(() => {
    if (parseFilmId(search.film) != null) return;
    const timer = window.setTimeout(() => {
      if (parseFilmId(new URLSearchParams(window.location.search).get(FILM_QUERY)) == null) {
        dismissedRef.current = null;
        clearDismiss();
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [search.film]);

  useEffect(() => {
    const id = parseFilmId(search.film);
    const videoId = parseShareVideoId(search.video);
    if (!search.film) {
      setModal(null);
      return;
    }
    if (id == null || dismissedRef.current === id || rememberedDismiss() === id) {
      if (id != null) {
        dismissedRef.current = id;
        rememberDismiss(id);
      }
      setModal(null);
      forgetFilmParam();
      publishLocation();
      return;
    }

    if (videoId) {
      setModal((current) => {
        if (current && current.item.id === id && current.videoId === videoId) return current;
        if (current && current.item.id === id) return { item: current.item, videoId };
        return { item: stubFilmItem(id, videoId), videoId };
      });
    }

    const ticket = requestRef.current + 1;
    requestRef.current = ticket;
    const controller = new AbortController();
    const leave = () => {
      if (ticket !== requestRef.current) return;
      dismissedRef.current = id;
      rememberDismiss(id);
      setModal(null);
      forgetFilmParam();
      publishLocation();
    };

    void (async () => {
      try {
        const res = await fetch(`/api/film/${id}`, {
          signal: controller.signal,
          headers: { accept: "application/json" },
        });
        if (ticket !== requestRef.current || dismissedRef.current === id) return;
        if (res.status === 404) {
          leave();
          return;
        }
        if (!res.ok) {
          if (!videoId) leave();
          return;
        }
        const item = readFilmPayload(await res.json());
        if (ticket !== requestRef.current || dismissedRef.current === id) return;
        if (!item || item.id !== id) {
          leave();
          return;
        }
        const target = resolveContentOpen(item);
        if (!target || target.type !== "modal") {
          leave();
          return;
        }
        setModal({ item, videoId: target.videoId });
      } catch {
        if (controller.signal.aborted || ticket !== requestRef.current || dismissedRef.current === id) return;
        if (!videoId) leave();
      }
    })();

    return () => controller.abort();
  }, [search.film, search.video]);

  if (!modal) return null;

  const close = () => {
    dismissedRef.current = modal.item.id;
    rememberDismiss(modal.item.id);
    setModal(null);
    // The player pushes #odtwarzacz and rewinds it on unmount. Stripping now
    // would edit that entry; Back then lands on ?film= and the popstate sync
    // removes it. System Back has already popped the hash before close runs.
    if (window.location.hash !== `#${VIDEO_HISTORY_HASH}`) {
      forgetFilmParam();
      publishLocation();
    }
  };

  return <VideoModal item={modal.item} videoId={modal.videoId} onClose={close} />;
}
