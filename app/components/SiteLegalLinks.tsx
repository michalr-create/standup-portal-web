"use client";

import Link from "next/link";
import CookieSettingsButton from "./CookieSettingsButton";
import { legalPagesAreReady } from "@/lib/legal/publish";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]";

export default function SiteLegalLinks({
  tone = "footer",
  onNavigate,
}: {
  tone?: "footer" | "drawer";
  onNavigate?: () => void;
}) {
  const ready = legalPagesAreReady();
  const footer = tone === "footer";
  const linkClass = footer
    ? `mono text-xs uppercase hover:text-white ${focusRing}`
    : `flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold hover:bg-[var(--ink-3)] ${focusRing}`;
  const style = { color: footer ? "var(--paper-mute)" : "var(--paper)" };
  return (
    <nav
      aria-label="Informacje"
      className={footer ? "flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-x-4" : "mt-4 flex flex-col"}
    >
      <CookieSettingsButton
        onOpen={onNavigate}
        className={footer ? "mono text-xs uppercase" : "rounded-lg px-3 text-sm font-semibold hover:bg-[var(--ink-3)]"}
        style={style}
      />
      {ready ? (
        <>
          <Link href="/polityka-prywatnosci" onClick={onNavigate} className={linkClass} style={style}>
            Polityka prywatności
          </Link>
          <Link href="/regulamin" onClick={onNavigate} className={linkClass} style={style}>
            Regulamin
          </Link>
          <Link href="/cookies" onClick={onNavigate} className={linkClass} style={style}>
            Cookies
          </Link>
        </>
      ) : null}
    </nav>
  );
}
