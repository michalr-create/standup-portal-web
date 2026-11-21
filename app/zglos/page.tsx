import type { Metadata } from "next";
import ReportForm from "./ReportForm";
import { REPORT_KINDS, type ReportKind } from "@/lib/content-report";

export const metadata: Metadata = {
  title: "Zgłoś — parska.",
  description: "Zgłoś brakujący film, błędny tag albo nowy open mic.",
};

type Search = {
  material?: string | string[];
  rodzaj?: string | string[];
};

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function kindFromQuery(rodzaj: string, material: string): ReportKind {
  if (material && /^[1-9]\d*$/.test(material)) return "wrong_meta";
  if (rodzaj === "open-mic") return "new_open_mic";
  if (rodzaj === "brak") return "missing_video";
  if ((REPORT_KINDS as readonly string[]).includes(rodzaj)) return rodzaj as ReportKind;
  return "missing_video";
}

export default async function ReportPage({ searchParams }: { searchParams: Promise<Search> }) {
  const raw = await searchParams;
  const material = first(raw.material);
  const contentItemId = /^[1-9]\d*$/.test(material) ? Number(material) : null;
  const kind = kindFromQuery(first(raw.rodzaj), material);
  const params = new URLSearchParams();
  if (contentItemId) params.set("material", String(contentItemId));
  else if (kind === "new_open_mic") params.set("rodzaj", "open-mic");
  else params.set("rodzaj", "brak");
  const returnPath = `/zglos?${params.toString()}`;

  return (
    <div className="band">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <p className="mono mb-3 text-xs uppercase" style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}>
            Dla zalogowanych
          </p>
          <h1 className="m-0 font-black leading-none" style={{ fontSize: "clamp(32px, 4vw, 44px)", letterSpacing: "-.025em" }}>
            Zgłoś
            <span className="dot-accent">.</span>
          </h1>
          <p className="mt-3 max-w-xl text-[15px]" style={{ color: "var(--paper-dim)" }}>
            Brakujący film z YouTube, zły tag, osoba albo format przy materiale, albo open mic, którego nie ma na liście. Najwyżej 10 zgłoszeń dziennie.
          </p>
        </header>
        <ReportForm initialKind={kind} contentItemId={contentItemId} returnPath={returnPath} />
      </div>
    </div>
  );
}
