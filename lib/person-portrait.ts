import { absoluteUrl } from "./seo.ts";

/** YouTube Developer Policies III.E.4: stored API data must be refreshed or deleted within 30 days. */
export const YOUTUBE_AVATAR_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** A clock a few minutes ahead of the database still counts as fresh. */
const FUTURE_SKEW_MS = 5 * 60 * 1000;

export const PERSON_PROFILE_CACHE_TAG = "person-by-slug";

const YOUTUBE_THUMBNAIL_HOSTS = new Set(["yt3.ggpht.com", "yt3.googleusercontent.com"]);

const LOCAL_IMAGE = /^\/standuperzy\/[a-z0-9][a-z0-9.-]*\.(jpg|jpeg|png|webp)$/;

export type ImageSource = "youtube" | "commons" | "own";

export type PersonImageRow = {
  image_url: string | null;
  image_source: string | null;
  image_credit: string | null;
  image_license: string | null;
  image_license_url: string | null;
  image_source_url: string | null;
  image_width: number | null;
  image_height: number | null;
  image_disabled: boolean | null;
  image_fetched_at: string | null;
  youtube_channel_url: string | null;
  youtube_image_url: string | null;
  youtube_image_width: number | null;
  youtube_image_height: number | null;
  image_fallback_url: string | null;
  image_fallback_credit: string | null;
  image_fallback_license: string | null;
  image_fallback_license_url: string | null;
  image_fallback_source_url: string | null;
  image_fallback_width: number | null;
  image_fallback_height: number | null;
  image_fallback_cropped: boolean | null;
};

export type PersonPortrait = {
  kind: ImageSource;
  /** Path or https URL passed to the image element. YouTube stays on Google's host. */
  src: string;
  width: number;
  height: number;
  /** Set only for a YouTube avatar, so the icon can link to that channel. */
  channelUrl: string | null;
  credit: string | null;
  license: string | null;
  licenseUrl: string | null;
  sourceUrl: string | null;
  cropped: boolean;
  /** Absolute URL of the photo actually shown. JSON-LD uses this. */
  schemaUrl: string;
  /**
   * Absolute URL for og:image.
   * When the visible photo is Commons and a fresh YouTube avatar is stored
   * (Lotek: the Commons file is 485×648), the avatar is the share image.
   */
  ogImage: string;
};

export function emptyPersonImage(): PersonImageRow {
  return {
    image_url: null,
    image_source: null,
    image_credit: null,
    image_license: null,
    image_license_url: null,
    image_source_url: null,
    image_width: null,
    image_height: null,
    image_disabled: false,
    image_fetched_at: null,
    youtube_channel_url: null,
    youtube_image_url: null,
    youtube_image_width: null,
    youtube_image_height: null,
    image_fallback_url: null,
    image_fallback_credit: null,
    image_fallback_license: null,
    image_fallback_license_url: null,
    image_fallback_source_url: null,
    image_fallback_width: null,
    image_fallback_height: null,
    image_fallback_cropped: false,
  };
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function flag(value: unknown): boolean {
  return value === true;
}

function whole(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  return null;
}

export function personImageFromUnknown(row: Record<string, unknown>): PersonImageRow {
  const source = text(row.image_source, 32);
  return {
    image_url: text(row.image_url, 2000),
    image_source: source === "youtube" || source === "commons" || source === "own" ? source : null,
    image_credit: text(row.image_credit, 200),
    image_license: text(row.image_license, 80),
    image_license_url: text(row.image_license_url, 500),
    image_source_url: text(row.image_source_url, 500),
    image_width: whole(row.image_width),
    image_height: whole(row.image_height),
    image_disabled: flag(row.image_disabled),
    image_fetched_at: text(row.image_fetched_at, 80),
    youtube_channel_url: text(row.youtube_channel_url, 500),
    youtube_image_url: text(row.youtube_image_url, 2000),
    youtube_image_width: whole(row.youtube_image_width),
    youtube_image_height: whole(row.youtube_image_height),
    image_fallback_url: text(row.image_fallback_url, 2000),
    image_fallback_credit: text(row.image_fallback_credit, 200),
    image_fallback_license: text(row.image_fallback_license, 80),
    image_fallback_license_url: text(row.image_fallback_license_url, 500),
    image_fallback_source_url: text(row.image_fallback_source_url, 500),
    image_fallback_width: whole(row.image_fallback_width),
    image_fallback_height: whole(row.image_fallback_height),
    image_fallback_cropped: flag(row.image_fallback_cropped),
  };
}

/** PostgREST before the profile-image migration is applied. */
export function isMissingPeopleImageColumn(error: { code?: string | null; message?: string | null }): boolean {
  const code = error.code ?? "";
  if (code === "42703" || code === "PGRST204") return true;
  const message = (error.message ?? "").toLowerCase();
  return message.includes("image_url") && (message.includes("does not exist") || message.includes("schema cache"));
}

export function youtubeThumbnailUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    if (!YOUTUBE_THUMBNAIL_HOSTS.has(url.hostname)) return null;
    // Keep the API string. Reserializing can rewrite a thumbnail URL.
    return trimmed;
  } catch {
    return null;
  }
}

export function youtubeChannelUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") return null;
    if (url.hostname !== "www.youtube.com") return null;
    if (url.username || url.password) return null;
    return trimmed;
  } catch {
    return null;
  }
}

export function youtubeChannelId(value: string | null | undefined): string | null {
  const id = value?.trim() ?? "";
  return /^UC[A-Za-z0-9_-]{22}$/.test(id) ? id : null;
}

export function youtubeAvatarFresh(fetchedAt: string | null | undefined, now: Date): boolean {
  if (!fetchedAt) return false;
  const fetched = Date.parse(fetchedAt);
  if (Number.isNaN(fetched)) return false;
  const age = now.getTime() - fetched;
  if (age < -FUTURE_SKEW_MS) return false;
  return age <= YOUTUBE_AVATAR_MAX_AGE_MS;
}

function httpsUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    return trimmed;
  } catch {
    return null;
  }
}

function hostedImage(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  if (LOCAL_IMAGE.test(trimmed)) return trimmed;
  const remote = httpsUrl(trimmed);
  if (!remote || youtubeThumbnailUrl(remote)) return null;
  return remote;
}

function box(width: number | null, height: number | null): { width: number; height: number } | null {
  if (width == null || height == null) return null;
  if (width <= 0 || height <= 0 || width > 20000 || height > 20000) return null;
  return { width, height };
}

function absoluteImage(src: string): string {
  return src.startsWith("/") ? absoluteUrl(src) : src;
}

type Shown = {
  kind: ImageSource;
  src: string;
  width: number;
  height: number;
  channelUrl: string | null;
  credit: string | null;
  license: string | null;
  licenseUrl: string | null;
  sourceUrl: string | null;
  cropped: boolean;
};

function portrait(shown: Shown, ogSrc: string): PersonPortrait {
  return {
    ...shown,
    schemaUrl: absoluteImage(shown.src),
    ogImage: absoluteImage(ogSrc),
  };
}

function freshYoutube(row: PersonImageRow, now: Date): { url: string; width: number; height: number } | null {
  if (!youtubeAvatarFresh(row.image_fetched_at, now)) return null;
  const fromColumn = youtubeThumbnailUrl(row.youtube_image_url);
  const fromImage = youtubeThumbnailUrl(row.image_url);
  const url = fromColumn ?? fromImage;
  if (!url) return null;
  const size = (fromColumn ? box(row.youtube_image_width, row.youtube_image_height) : null)
    ?? box(row.image_width, row.image_height)
    ?? { width: 800, height: 800 };
  return { url, ...size };
}

/**
 * Photo for /standuper/[slug].
 * image_disabled hides every source.
 * A YouTube URL older than 30 days is not shown.
 * Commons backup (Ruciński, Sumowski) is used only after a refresh has run
 * and the avatar is missing or stale — not before the first fetch.
 * Lotek's visible photo is Commons; og:image uses a fresh YouTube avatar.
 */
export function resolvePersonPortrait(row: PersonImageRow | null | undefined, now = new Date()): PersonPortrait | null {
  if (!row || row.image_disabled) return null;
  const source = row.image_source === "youtube" || row.image_source === "commons" || row.image_source === "own"
    ? row.image_source
    : null;
  const fresh = freshYoutube(row, now);
  const channelUrl = youtubeChannelUrl(row.youtube_channel_url);

  if (source === "commons" || source === "own") {
    const src = hostedImage(row.image_url);
    const size = box(row.image_width, row.image_height);
    if (src && size) {
      return portrait({
        kind: source,
        src,
        width: size.width,
        height: size.height,
        channelUrl: null,
        credit: row.image_credit,
        license: row.image_license,
        licenseUrl: httpsUrl(row.image_license_url),
        sourceUrl: httpsUrl(row.image_source_url),
        cropped: false,
      }, fresh?.url ?? src);
    }
  }

  if (source === "youtube" && fresh) {
    return portrait({
      kind: "youtube",
      src: fresh.url,
      width: fresh.width,
      height: fresh.height,
      channelUrl,
      credit: null,
      license: null,
      licenseUrl: null,
      sourceUrl: null,
      cropped: false,
    }, fresh.url);
  }

  const triedYoutube = source === "youtube" && Boolean(row.image_fetched_at);
  if (triedYoutube) {
    const src = hostedImage(row.image_fallback_url);
    const size = box(row.image_fallback_width, row.image_fallback_height);
    if (src && size) {
      return portrait({
        kind: "commons",
        src,
        width: size.width,
        height: size.height,
        channelUrl: null,
        credit: row.image_fallback_credit,
        license: row.image_fallback_license,
        licenseUrl: httpsUrl(row.image_fallback_license_url),
        sourceUrl: httpsUrl(row.image_fallback_source_url),
        cropped: row.image_fallback_cropped === true,
      }, src);
    }
  }

  return null;
}

export function portraitJsonLd(shown: PersonPortrait): {
  url: string;
  width: number;
  height: number;
  creditText?: string;
  license?: string;
  acquireLicensePage?: string;
  caption?: string;
} {
  const image: {
    url: string;
    width: number;
    height: number;
    creditText?: string;
    license?: string;
    acquireLicensePage?: string;
    caption?: string;
  } = {
    url: shown.schemaUrl,
    width: shown.width,
    height: shown.height,
  };
  if (shown.kind === "youtube") return image;
  if (shown.credit) image.creditText = shown.credit;
  if (shown.licenseUrl) image.license = shown.licenseUrl;
  if (shown.sourceUrl) image.acquireLicensePage = shown.sourceUrl;
  if (shown.cropped) image.caption = "przycięte";
  return image;
}

/** Confirmed channel plus any active YouTube sources already linked in the database. */
export function profileSameAs(
  sourceUrls: readonly (string | null | undefined)[],
  channelUrl: string | null | undefined,
): string[] {
  const urls = sourceUrls.filter((url): url is string => typeof url === "string");
  const channel = youtubeChannelUrl(channelUrl);
  return channel ? [...urls, channel] : urls;
}
