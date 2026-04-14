import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DebugPage() {
  const { data, error, count } = await supabase
    .from("content_items")
    .select("*", { count: "exact" })
    .eq("status", "approved");

  return (
    <main style={{ padding: 20, fontFamily: "monospace", color: "white" }}>
      <h1>Debug</h1>
      <p>Error: {error ? JSON.stringify(error) : "brak"}</p>
      <p>Count: {count ?? "null"}</p>
      <p>Data length: {data?.length ?? "null"}</p>
      <pre style={{ background: "#222", padding: 10, overflow: "auto" }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </main>
  );
}
