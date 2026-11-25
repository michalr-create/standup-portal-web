import { PERSON_PROFILE_CACHE_TAG, youtubeChannelId } from "./person-portrait.ts";
import { getAdminSupabase } from "./supabase-admin.ts";
import {
  fetchChannelThumbnails,
  planAvatarWrites,
  type AvatarRow,
  type AvatarWrite,
} from "./youtube-avatars.ts";

export type AvatarRefreshResult = {
  updated: number;
  cleared: number;
  skipped: number;
};

type RefreshDeps = {
  now?: Date;
  fetchImpl?: typeof fetch;
  apiKey?: string;
  loadRows?: () => Promise<AvatarRow[]>;
  write?: (row: AvatarWrite) => Promise<void>;
  revalidate?: () => void;
};

async function loadAvatarRows(): Promise<AvatarRow[]> {
  let supabase: ReturnType<typeof getAdminSupabase>;
  try {
    supabase = getAdminSupabase();
  } catch {
    throw new Error("missing_supabase_service_key");
  }
  const { data, error } = await supabase
    .from("people")
    .select("id, image_source, youtube_channel_id")
    .eq("fetch_youtube_avatar", true)
    .not("youtube_channel_id", "is", null);
  if (error) throw new Error("people_read_failed");
  const rows: AvatarRow[] = [];
  for (const row of data ?? []) {
    if (typeof row.id !== "number" || !youtubeChannelId(row.youtube_channel_id)) continue;
    rows.push({
      id: row.id,
      image_source: typeof row.image_source === "string" ? row.image_source : null,
      youtube_channel_id: row.youtube_channel_id,
    });
  }
  return rows;
}

async function writeAvatar(row: AvatarWrite): Promise<void> {
  const { id, ...patch } = row;
  const supabase = getAdminSupabase();
  const { error } = await supabase.from("people").update(patch).eq("id", id);
  if (error) throw new Error("people_write_failed");
}

/**
 * Refresh stored YouTube avatar URLs. The image file stays on Google.
 * Call at least every 30 days. A failed request leaves the previous URL in
 * place; the profile hides it once image_fetched_at is older than 30 days.
 */
export async function refreshYoutubeAvatars(deps: RefreshDeps = {}): Promise<AvatarRefreshResult> {
  const apiKey = (deps.apiKey ?? process.env.YOUTUBE_API_KEY ?? "").trim();
  if (!apiKey) throw new Error("missing_youtube_api_key");
  const loadRows = deps.loadRows ?? loadAvatarRows;
  const write = deps.write ?? writeAvatar;
  const rows = await loadRows();
  const ids = rows.flatMap((row) => {
    const id = youtubeChannelId(row.youtube_channel_id);
    return id ? [id] : [];
  });
  const found = await fetchChannelThumbnails(ids, apiKey, deps.fetchImpl ?? fetch);
  const writes = planAvatarWrites(rows, found, deps.now ?? new Date());
  for (const row of writes) await write(row);
  const revalidate = deps.revalidate ?? (async () => {
    const { revalidateTag } = await import("next/cache");
    revalidateTag(PERSON_PROFILE_CACHE_TAG);
  });
  if (writes.length > 0) await revalidate();
  let cleared = 0;
  for (const row of writes) {
    if (!row.youtube_image_url) cleared += 1;
  }
  return {
    updated: writes.length - cleared,
    cleared,
    skipped: rows.length - writes.length,
  };
}
