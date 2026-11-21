import { NextResponse } from "next/server";
import { getApprovedItemsByIds } from "@/lib/data";
import { parseFilmId } from "@/lib/film-link";

export const dynamic = "force-dynamic";

const PRIVATE = { "Cache-Control": "private, no-store" };

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id: raw } = await params;
  const id = parseFilmId(raw);
  if (id == null) {
    return NextResponse.json({ item: null }, { status: 404, headers: PRIVATE });
  }
  try {
    const items = await getApprovedItemsByIds([id]);
    const item = items.find((entry) => entry.id === id) ?? null;
    if (!item) return NextResponse.json({ item: null }, { status: 404, headers: PRIVATE });
    return NextResponse.json({ item }, { headers: PRIVATE });
  } catch {
    return NextResponse.json({ item: null }, { status: 404, headers: PRIVATE });
  }
}
