import { NextResponse, type NextRequest } from "next/server";
import { insertAnalyticsEvent } from "@/lib/analytics-log";
import { hasConsent } from "@/lib/consent";

export const dynamic = "force-dynamic";

const MAX_BODY = 4000;

function sameSite(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.nextUrl.host;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!sameSite(request)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  const rawConsent = request.cookies.get("parska_consent")?.value ?? null;
  if (!hasConsent("analytics", rawConsent)) {
    return new NextResponse(null, { status: 204 });
  }
  const text = await request.text();
  if (text.length > MAX_BODY) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const record = body as { name?: unknown; props?: unknown };
  const saved = await insertAnalyticsEvent(record.name, record.props ?? {});
  if (!saved.ok) return NextResponse.json({ ok: false }, { status: 400 });
  return new NextResponse(null, { status: 204 });
}
