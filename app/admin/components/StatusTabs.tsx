"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function StatusTabs({ counts }: { counts: { pending: number; approved: number; rejected: number; featured: number } }) {
  const searchParams = useSearchParams();
  const current = searchParams.get("status") || "pending";

  const tabs = [
    { key: "pending", label: "Pending", count: counts.pending },
    { key: "approved", label: "Zatwierdzone", count: counts.approved },
    { key: "featured", label: "Wyroznione", count: counts.featured },
    { key: "rejected", label: "Odrzucone", count: counts.rejected },
  ];

  return (
    <div className="flex gap-1 mb-6 flex-wrap">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.key === "pending" ? "/admin" : `/admin?status=${tab.key}`}
          className={
            current === tab.key
              ? "px-4 py-2 rounded-lg text-sm font-medium bg-white text-black"
              : "px-4 py-2 rounded-lg text-sm font-medium bg-neutral-800 text-gray-300 hover:bg-neutral-700"
          }
        >
          {tab.label} ({tab.count})
        </Link>
      ))}
    </div>
  );
}
