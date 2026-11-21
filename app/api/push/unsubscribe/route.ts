import { NextRequest, NextResponse } from "next/server";
import { parsePushEndpoint } from "@/lib/push-dispatch";
import { getAdminSupabase } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const endpoint = parsePushEndpoint(body);
  if (!endpoint) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const { error } = await getAdminSupabase()
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);
  if (error) {
    console.error("push unsubscribe", error.code);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
