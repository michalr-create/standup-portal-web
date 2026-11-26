"use client";

import { useEffect } from "react";
import { trackParska } from "@/lib/analytics";

/** One profile visit after hydration. Bots that do not run JS never send it. */
export default function ProfileVisit({ slug }: { slug: string }) {
  useEffect(() => {
    if (navigator.webdriver) return;
    trackParska("wejscie_na_profil", { slug });
  }, [slug]);
  return null;
}
