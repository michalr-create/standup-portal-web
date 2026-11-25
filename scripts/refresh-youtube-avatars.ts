/**
 * Refresh YouTube avatar URLs stored on people.
 * Does not download the image. Requires, in the environment:
 *   YOUTUBE_API_KEY
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_KEY
 *
 * Run from the repo root after the profile-image migration is applied:
 *   node --experimental-strip-types scripts/refresh-youtube-avatars.ts
 *
 * The site hides a stored URL 30 days after image_fetched_at, so run this
 * at least that often. Production also calls GET /api/cron/youtube-avatars
 * on the 1st and 15th (CRON_SECRET).
 */
import { refreshYoutubeAvatars } from "../lib/refresh-youtube-avatars.ts";

refreshYoutubeAvatars({ revalidate: () => {} }).then(
  (result) => {
    console.log(JSON.stringify(result));
  },
  (error: unknown) => {
    const message = error instanceof Error ? error.message : "refresh_failed";
    console.error(message);
    process.exitCode = 1;
  },
);
