import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type ContentItem = {
  id: number;
  title: string;
  description: string | null;
  url: string;
  thumbnail_url: string | null;
  published_at: string | null;
  content_type: string | null;
  source_id: number;
  sources?: {
    name: string;
    comedian_id: number | null;
    comedians?: {
      name: string;
      slug: string;
    } | null;
  } | null;
};
