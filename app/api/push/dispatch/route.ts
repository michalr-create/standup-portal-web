import { NextRequest, NextResponse } from "next/server";
import { runPushDispatch } from "@/lib/push-run";
import { secretsMatch } from "@/lib/revalidate-secret";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const expected = process.env.PUSH_DISPATCH_SECRET ?? "";
  const provided = req.headers.get("x-push-dispatch-secret") ?? "";
  if (!expected || !secretsMatch(provided, expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await runPushDispatch();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "error";
    console.error("push dispatch", message === "missing_vapid" ? message : "failed");
    return NextResponse.json({ error: "dispatch_failed" }, { status: 500 });
  }
}
