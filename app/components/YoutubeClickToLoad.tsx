"use client";

import Link from "next/link";
import SizedImage from "./SizedImage";
import { IMAGE_SIZE } from "@/lib/image-alt";
import { useYoutubeGate } from "./useYoutubeGate";
import { youtubeEmbedSrc } from "@/lib/youtube-embed";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]";

function posterFor(videoId: string, posterUrl?: string | null): string {
  const trimmed = posterUrl?.trim() ?? "";
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) return trimmed;
  return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
}

/**
 * Click-to-load frame for pages that are not the in-app player.
 * No iframe until embeds consent or an explicit play click.
 */
export default function YoutubeClickToLoad({
  videoId,
  title,
  posterUrl,
}: {
  videoId: string;
  title: string;
  posterUrl?: string | null;
}) {
  const gate = useYoutubeGate(videoId);
  const src = gate.mounted
    ? youtubeEmbedSrc(videoId, { host: "nocookie", autoplay: true, jsApi: false })
    : "";

  return (
    <div className="absolute inset-0">
      {gate.mounted ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={src}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <>
          <SizedImage
            src={posterFor(videoId, posterUrl)}
            alt=""
            width={IMAGE_SIZE.youtubePoster.width}
            height={IMAGE_SIZE.youtubePoster.height}
            lazy={false}
            decorative
            className="h-full w-full object-cover"
          />
          <div className="video-modal-gate">
            <button type="button" className={`video-modal-gate-play ${focusRing}`} onClick={gate.start}>
              Odtwórz
            </button>
            <p className="video-modal-gate-copy">
              {"Wczytamy odtwarzacz YouTube (Google). YouTube może zapisać pliki cookie. "}
              <Link href="/cookies" className={focusRing} style={{ color: "var(--coral)" }}>
                Więcej
              </Link>
            </p>
            <label className="video-modal-gate-remember">
              <input
                type="checkbox"
                checked={gate.remember}
                onChange={(event) => gate.setRemember(event.target.checked)}
              />
              Zapamiętaj wybór (zgoda na osadzenia YouTube)
            </label>
          </div>
        </>
      )}
    </div>
  );
}
