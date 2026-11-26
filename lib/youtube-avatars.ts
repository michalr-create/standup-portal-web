import { youtubeChannelId, youtubeThumbnailUrl } from "./person-portrait.ts";

const DOCUMENTED_SIZE = { high: 800, medium: 240, default: 88 } as const;

export type ChannelThumbnail = {
  url: string;
  width: number;
  height: number;
};

export type ThumbnailMap = {
  high?: { url?: string; width?: number; height?: number };
  medium?: { url?: string; width?: number; height?: number };
  default?: { url?: string; width?: number; height?: number };
};

export type AvatarRow = {
  id: number;
  image_source: string | null;
  youtube_channel_id: string | null;
};

export type AvatarWrite = {
  id: number;
  youtube_image_url: string | null;
  youtube_image_width: number | null;
  youtube_image_height: number | null;
  image_fetched_at: string;
  image_url?: string | null;
  image_width?: number | null;
  image_height?: number | null;
};

function positive(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 20000 ? value : fallback;
}

/**
 * Largest usable channels.list thumbnail, URL unchanged.
 * `high` is 800×800 in the API docs. http and other hosts are rejected.
 */
export function pickChannelThumbnail(thumbnails: ThumbnailMap | null | undefined): ChannelThumbnail | null {
  if (!thumbnails) return null;
  for (const slot of ["high", "medium", "default"] as const) {
    const thumb = thumbnails[slot];
    const url = youtubeThumbnailUrl(thumb?.url);
    if (!url) continue;
    return {
      url,
      width: positive(thumb?.width, DOCUMENTED_SIZE[slot]),
      height: positive(thumb?.height, DOCUMENTED_SIZE[slot]),
    };
  }
  return null;
}

export function channelsListUrl(ids: readonly string[], apiKey: string): string {
  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("id", ids.join(","));
  url.searchParams.set("maxResults", "50");
  url.searchParams.set("key", apiKey);
  return url.toString();
}

export function parseChannelItem(item: unknown): { id: string; thumbnail: ChannelThumbnail | null } | null {
  if (!item || typeof item !== "object") return null;
  const record = item as { id?: unknown; snippet?: { thumbnails?: ThumbnailMap } };
  const id = youtubeChannelId(typeof record.id === "string" ? record.id : null);
  if (!id) return null;
  return { id, thumbnail: pickChannelThumbnail(record.snippet?.thumbnails) };
}

/**
 * One write per requested channel that the API answered for.
 * A missing channel or an unusable thumbnail clears the stored URL.
 * Commons `image_url` (Lotek, Giza) is not overwritten. YouTube rows copy the
 * hotlink into `image_url` so that column stays the display URL.
 */
export function planAvatarWrites(
  rows: readonly AvatarRow[],
  found: ReadonlyMap<string, ChannelThumbnail | null>,
  now: Date,
): AvatarWrite[] {
  const fetchedAt = now.toISOString();
  const writes: AvatarWrite[] = [];
  for (const row of rows) {
    const id = youtubeChannelId(row.youtube_channel_id);
    if (!id || !found.has(id)) continue;
    const thumb = found.get(id) ?? null;
    const write: AvatarWrite = {
      id: row.id,
      youtube_image_url: thumb?.url ?? null,
      youtube_image_width: thumb?.width ?? null,
      youtube_image_height: thumb?.height ?? null,
      image_fetched_at: fetchedAt,
    };
    if (row.image_source === "youtube") {
      write.image_url = thumb?.url ?? null;
      write.image_width = thumb?.width ?? null;
      write.image_height = thumb?.height ?? null;
    }
    writes.push(write);
  }
  return writes;
}

export async function fetchChannelThumbnails(
  ids: readonly string[],
  apiKey: string,
  fetchImpl: typeof fetch,
): Promise<Map<string, ChannelThumbnail | null>> {
  const found = new Map<string, ChannelThumbnail | null>();
  for (let index = 0; index < ids.length; index += 50) {
    const group = ids.slice(index, index + 50);
    const response = await fetchImpl(channelsListUrl(group, apiKey));
    if (!response.ok) throw new Error("youtube_api_error");
    const body = await response.json() as { items?: unknown };
    if (!Array.isArray(body.items)) throw new Error("youtube_api_error");
    const seen = new Set<string>();
    for (const item of body.items) {
      const parsed = parseChannelItem(item);
      if (!parsed || !group.includes(parsed.id)) continue;
      seen.add(parsed.id);
      found.set(parsed.id, parsed.thumbnail);
    }
    for (const id of group) {
      if (!seen.has(id)) found.set(id, null);
    }
  }
  return found;
}
