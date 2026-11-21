import { NextRequest, NextResponse } from "next/server";
import { parsePushSubscription } from "@/lib/push-dispatch";
import { planPushSubscribe } from "@/lib/push-subscribe";
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

const conflict = () => NextResponse.json({ error: "conflict" }, { status: 409 });
const failed = () => NextResponse.json({ error: "save_failed" }, { status: 500 });

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

  const admin = getAdminSupabase();
  const keys = {
    p256dh: parsed.p256dh,
    auth: parsed.auth,
    user_agent: userAgentOf(req),
    failure_count: 0,
  };

  const existing = await admin
    .from("push_subscriptions")
    .select("user_id")
    .eq("endpoint", parsed.endpoint)
    .maybeSingle();
  if (existing.error) {
    console.error("push subscribe", existing.error.code);
    return failed();
  }

  const owner = typeof existing.data?.user_id === "string" ? existing.data.user_id : null;
  const plan = planPushSubscribe(owner, user.id);
  if (plan === "reject") return conflict();

  if (plan === "update") {
    const updated = await admin
      .from("push_subscriptions")
      .update(keys)
      .eq("endpoint", parsed.endpoint)
      .eq("user_id", user.id)
      .select("id");
    if (updated.error) {
      console.error("push subscribe", updated.error.code);
      return failed();
    }
    if (!updated.data?.length) return conflict();
    return NextResponse.json({ ok: true });
  }

  const inserted = await admin.from("push_subscriptions").insert({
    user_id: user.id,
    endpoint: parsed.endpoint,
    ...keys,
  });
  if (!inserted.error) return NextResponse.json({ ok: true });
  if (inserted.error.code !== "23505") {
    console.error("push subscribe", inserted.error.code);
    return failed();
  }

  const again = await admin
    .from("push_subscriptions")
    .select("user_id")
    .eq("endpoint", parsed.endpoint)
    .maybeSingle();
  if (again.error) {
    console.error("push subscribe", again.error.code);
    return failed();
  }
  const raced = typeof again.data?.user_id === "string" ? again.data.user_id : null;
  if (planPushSubscribe(raced, user.id) !== "update") return conflict();

  const claimed = await admin
    .from("push_subscriptions")
    .update(keys)
    .eq("endpoint", parsed.endpoint)
    .eq("user_id", user.id)
    .select("id");
  if (claimed.error) {
    console.error("push subscribe", claimed.error.code);
    return failed();
  }
  if (!claimed.data?.length) return conflict();
  return NextResponse.json({ ok: true });
}
