"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { nostalgiaCookieAssignment } from "@/lib/nostalgia";

export default function NostalgiaReroll({ ids }: { ids: number[] }) {
  const router = useRouter();
  const assignment = nostalgiaCookieAssignment(ids);

  useEffect(() => {
    if (ids.length === 0) return;
    document.cookie = assignment;
  }, [assignment, ids.length]);

  return (
    <button
      type="button"
      onClick={() => {
        if (ids.length > 0) document.cookie = assignment;
        router.refresh();
      }}
      className="inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-black transition-colors hover:bg-[var(--ink-3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]"
      style={{ color: "var(--paper)", border: "1px solid var(--line-2)" }}
    >
      Wylosuj inne
    </button>
  );
}
