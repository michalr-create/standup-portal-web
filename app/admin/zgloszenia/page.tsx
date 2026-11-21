import Link from "next/link";
import ReportStatusControl from "./ReportStatusControl";
import { isReportStatus, reportKindLabel, type ReportStatus } from "@/lib/content-report";
import { requireAuth } from "@/lib/admin-auth";
import { getServerSupabase } from "@/lib/supabase-server";

type ReportListRow = {
  id: number;
  user_id: string;
  kind: string;
  content_item_id: number | null;
  url: string | null;
  message: string;
  status: ReportStatus;
  created_at: string;
};

function asRow(value: Record<string, unknown>): ReportListRow | null {
  const id = typeof value.id === "number" ? value.id : Number(value.id);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const status = typeof value.status === "string" && isReportStatus(value.status) ? value.status : null;
  if (!status) return null;
  return {
    id,
    user_id: typeof value.user_id === "string" ? value.user_id : "",
    kind: typeof value.kind === "string" ? value.kind : "",
    content_item_id: typeof value.content_item_id === "number" ? value.content_item_id : null,
    url: typeof value.url === "string" ? value.url : null,
    message: typeof value.message === "string" ? value.message : "",
    status,
    created_at: typeof value.created_at === "string" ? value.created_at : "",
  };
}

export default async function AdminReportsPage() {
  await requireAuth();
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("content_reports")
    .select("id, user_id, kind, content_item_id, url, message, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = error ? [] : (data ?? []).map((row) => asRow(row as Record<string, unknown>)).filter((row): row is ReportListRow => row != null);

  return (
    <div className="px-6 py-8">
      <h1 className="mb-2 text-2xl font-black">Zgłoszenia</h1>
      <p className="mb-6 text-sm text-neutral-400">
        Nowe wpisy od zalogowanych czytelników. Status zmieniasz na liście.
      </p>
      {error && (
        <p role="alert" className="mb-4 text-sm text-red-300">
          Nie udało się wczytać zgłoszeń. Tabela zgłoszeń musi być już na bazie.
        </p>
      )}
      {rows.length === 0 && !error ? (
        <p className="text-sm text-neutral-400">Brak zgłoszeń.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {rows.map((row) => (
            <li key={row.id} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="m-0 text-xs uppercase tracking-wide text-neutral-500">
                    {reportKindLabel(row.kind)} · {row.created_at.slice(0, 16).replace("T", " ")}
                  </p>
                  <p className="m-0 mt-2 whitespace-pre-wrap text-sm text-neutral-100">{row.message || "Bez dopisku."}</p>
                  <p className="m-0 mt-2 break-all text-xs text-neutral-400">
                    {row.content_item_id != null && <span>Materiał {row.content_item_id}. </span>}
                    {row.url && (
                      <a href={row.url} target="_blank" rel="noopener noreferrer" className="underline">
                        {row.url}
                      </a>
                    )}
                  </p>
                  <p className="m-0 mt-1 font-mono text-[11px] text-neutral-500">{row.user_id}</p>
                </div>
                <ReportStatusControl id={row.id} status={row.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-8 text-sm">
        <Link href="/admin" className="text-neutral-400 underline">
          Wróć do moderacji
        </Link>
      </p>
    </div>
  );
}
