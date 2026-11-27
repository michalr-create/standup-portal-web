"use client";

import type { CSSProperties } from "react";
import { openConsentSettings } from "@/lib/consent";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]";

export default function CookieSettingsButton({
  className = "",
  style,
  onOpen,
}: {
  className?: string;
  style?: CSSProperties;
  onOpen?: () => void;
}) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-11 items-center bg-transparent p-0 text-left hover:text-white ${focusRing} ${className}`}
      style={{ color: "var(--paper-dim)", ...style }}
      onClick={() => {
        onOpen?.();
        openConsentSettings();
      }}
    >
      Ustawienia cookies
    </button>
  );
}
