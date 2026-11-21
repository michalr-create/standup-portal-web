import { NextRequest, NextResponse } from "next/server";
import { classifyPushResult, nextFailureCount, parsePushEndpoint, PUSH_ICON, type PushMessage } from "@/lib/push-dispatch";
import { configureVapid, deliverPush } from "@/lib/push-send";
import { getAdminSupabase } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TEST_MESSAGE: PushMessage = {
  kind: "new_content",
  title: "Test parska",
  body: "Tak wygląda powiadomienie z parski.",
  icon: PUSH_ICON,
  url: "/ulubione",
  refIds: [],
};

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

  try {
    configureVapid();
  } catch {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  const client = getAdminSupabase();
  const { data, error } = await client
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth, failure_count")
    .eq("user_id", user.id)
    .eq("endpoint", endpoint)
    .maybeSingle();
  if (error) {
    console.error("push test", error.code);
    return NextResponse.json({ error: "send_failed" }, { status: 500 });
  }
  if (!data || typeof data.endpoint !== "string" || typeof data.p256dh !== "string" || typeof data.auth !== "string") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const result = await deliverPush(
    { endpoint: data.endpoint, p256dh: data.p256dh, auth: data.auth },
    TEST_MESSAGE,
  );
  const kind = classifyPushResult(result.statusCode);
  if (kind === "gone") {
    await client.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", endpoint);
    return NextResponse.json({ error: "gone" }, { status: 410 });
  }
  if (kind === "ok") {
    await client
      .from("push_subscriptions")
      .update({ last_success_at: new Date().toISOString(), failure_count: 0 })
      .eq("endpoint", endpoint);
    return NextResponse.json({ ok: true });
  }

  const current = typeof data.failure_count === "number" ? data.failure_count : 0;
  await client.from("push_subscriptions").update({ failure_count: nextFailureCount(current) }).eq("endpoint", endpoint);
  console.error("push test failed", result.statusCode);
  return NextResponse.json({ error: "send_failed" }, { status: 502 });
}
