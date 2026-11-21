import { NextResponse } from "next/server";
import { buildEventIcs } from "@/lib/calendar-ics";
import { supabase } from "@/lib/supabase";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  if (!/^[1-9]\d{0,9}$/.test(id)) {
    return new NextResponse("Nie znaleziono wydarzenia.", { status: 404 });
  }

  const { data, error } = await supabase
    .from("events")
    .select("id, title, starts_at, city, venue, ticket_url")
    .eq("id", Number(id))
    .maybeSingle();

  if (error || !data) {
    return new NextResponse("Nie znaleziono wydarzenia.", { status: 404 });
  }

  const body = buildEventIcs({
    id: Number(data.id),
    title: typeof data.title === "string" && data.title.trim() ? data.title : `${data.city}: ${data.venue}`,
    startsAt: String(data.starts_at),
    city: typeof data.city === "string" ? data.city : "",
    venue: typeof data.venue === "string" ? data.venue : "",
    ticketUrl: typeof data.ticket_url === "string" ? data.ticket_url : null,
    stampedAt: new Date(),
  });
  if (!body) {
    return new NextResponse("Nie znaleziono wydarzenia.", { status: 404 });
  }

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="parska-${id}.ics"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
