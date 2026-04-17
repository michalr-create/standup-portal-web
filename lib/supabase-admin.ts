import { createClient } from "@supabase/supabase-js";

export function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_KEY!;

  if (!key) {
    throw new Error("Brak SUPABASE_SERVICE_KEY w zmiennych srodowiskowych");
  }

  return createClient(url, key);
}
