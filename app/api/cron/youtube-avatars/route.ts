import { NextRequest, NextResponse } from "next/server";
import { refreshYoutubeAvatars } from "@/lib/refresh-youtube-avatars";
import { secretsMatch } from "@/lib/revalidate-secret";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET ?? "";
  const header = req.headers.get("authorization") ?? "";
  const bearer = header.slice(0, 7).toLowerCase() === "bearer " ? header.slice(7).trim() : "";
  const alternate = req.headers.get("x-cron-secret") ?? "";
  if (!expected) return false;
  return secretsMatch(bearer, expected) || secretsMatch(alternate, expected);
}

async function run() {
  try {
    const result = await refreshYoutubeAvatars();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "refresh_failed";
    if (message === "missing_youtube_api_key") {
      return NextResponse.json({ error: "missing_youtube_api_key" }, { status: 503 });
    }
    console.error("youtube avatars", message === "youtube_api_error" ? message : "refresh_failed");
    return NextResponse.json({ error: "refresh_failed" }, { status: 500 });
  }
}

/** Vercel Cron calls GET. A manual refresh can POST the same secret. */
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return run();
}

export async function POST(req: NextRequest) {
  return GET(req);
}
