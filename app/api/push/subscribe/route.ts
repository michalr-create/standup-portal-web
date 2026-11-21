import { NextRequest, NextResponse } from "next/server";
import { parsePushSubscription } from "@/lib/push-dispatch";
import { getAdminSupabase } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function userAgentOf(req: NextRequest): string | null {
  const raw = req.headers.get("user-agent");
  if (!raw) return null;
  const trimmed = raw.trim().slice(0, 300);
  return trimmed || null;
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const parsed = parsePushSubscription(body);
  if (!parsed) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const { error } = await getAdminSupabase().from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: parsed.endpoint,
      p256dh: parsed.p256dh,
      auth: parsed.auth,
      user_agent: userAgentOf(req),
      failure_count: 0,
    },
    { onConflict: "endpoint" },
  );
  if (error) {
    console.error("push subscribe", error.code);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
