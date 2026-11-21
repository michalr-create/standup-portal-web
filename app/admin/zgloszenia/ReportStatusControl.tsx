"use client";

import { useState } from "react";
import { setReportStatus } from "./actions";
import { REPORT_STATUSES, reportStatusLabel, type ReportStatus } from "@/lib/content-report";

export default function ReportStatusControl({
  id,
  status,
}: {
  id: number;
  status: ReportStatus;
}) {
  const [current, setCurrent] = useState(status);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label className="sr-only" htmlFor={`report-status-${id}`}>
        Status zgłoszenia {id}
      </label>
      <select
        id={`report-status-${id}`}
        className="min-h-11 rounded-lg border border-neutral-700 bg-neutral-900 px-2 text-sm"
        value={current}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.value;
          if (!(REPORT_STATUSES as readonly string[]).includes(next)) return;
          const previous = current;
          setCurrent(next as ReportStatus);
          setPending(true);
          setError(null);
          void setReportStatus(id, next).then((result) => {
            setPending(false);
            if (!result.ok) {
              setCurrent(previous);
              setError(result.error);
            }
          });
        }}
      >
        {REPORT_STATUSES.map((value) => (
          <option key={value} value={value}>
            {reportStatusLabel(value)}
          </option>
        ))}
      </select>
      {error && (
        <p role="alert" className="m-0 text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
