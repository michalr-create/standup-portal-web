export type YoutubeEmbedHost = "nocookie" | "youtube";

/** Default embed host. nocookie limits cookies; it does not make playback private. */
export function youtubeEmbedOrigin(host: YoutubeEmbedHost = "nocookie"): string {
  return host === "nocookie" ? "https://www.youtube-nocookie.com" : "https://www.youtube.com";
}

export function shouldMountYoutubePlayer(input: { embedsConsent: boolean; explicitPlay: boolean }): boolean {
  return input.embedsConsent || input.explicitPlay;
}

/**
 * After an explicit "Odtwórz" click, a silent nocookie JS API may fall back
 * to youtube.com. Consent alone must not switch hosts.
 */
export function shouldFallbackToYoutubeHost(input: {
  explicitPlay: boolean;
  host: YoutubeEmbedHost;
  heardApi: boolean;
}): boolean {
  return input.explicitPlay && input.host === "nocookie" && !input.heardApi;
}

export const YOUTUBE_NOCOOKIE_API_TIMEOUT_MS = 8000;

export function youtubeEmbedSrc(
  videoId: string,
  options: {
    host?: YoutubeEmbedHost;
    phoneEmbed?: boolean;
    origin?: string;
    autoplay?: boolean;
    jsApi?: boolean;
  } = {},
): string {
  const host = options.host ?? "nocookie";
  const params = new URLSearchParams();
  if (options.autoplay !== false) params.set("autoplay", "1");
  params.set("playsinline", "1");
  if (options.jsApi !== false) params.set("enablejsapi", "1");
  if (options.phoneEmbed) params.set("fs", "0");
  if (options.origin) params.set("origin", options.origin);
  return `${youtubeEmbedOrigin(host)}/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
}
