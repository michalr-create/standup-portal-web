import { NextRequest, NextResponse } from "next/server";
import { getApprovedItemsByIds } from "@/lib/data";
import { normalizeIds } from "@/lib/library-sync";

export async function POST(req: NextRequest) {
  const body: { ids?: unknown } = await req.json().catch(() => ({ ids: [] }));
  const ids = normalizeIds(body?.ids, 60);
  const items = await getApprovedItemsByIds(ids);
  return NextResponse.json({ items });
}
