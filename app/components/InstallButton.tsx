"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallMode = "hidden" | "chromium" | "ios";

type InstallContextValue = {
  mode: InstallMode;
  canInstall: boolean;
  install: () => Promise<void>;
};

const InstallContext = createContext<InstallContextValue | null>(null);

function isInstalledDisplay(): boolean {
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  if (window.matchMedia("(display-mode: minimal-ui)").matches) return true;
  const standalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return standalone === true;
}

function isIosDevice(): boolean {
  const ua = window.navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+ reports a desktop Mac UA unless the site is requested as mobile.
  return window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1;
}

function useInstall(): InstallContextValue {
  const value = useContext(InstallContext);
  if (!value) {
    throw new Error("Przycisk instalacji musi być wewnątrz InstallProvider");
  }
  return value;
}

export function InstallProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<InstallMode>("hidden");

  useEffect(() => {
    if (isInstalledDisplay()) return;

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setMode("chromium");
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
      setMode("hidden");
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (isIosDevice()) setMode("ios");

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setMode("hidden");
    }
  }, [deferredPrompt]);

  const value = useMemo<InstallContextValue>(
    () => ({
      mode,
      canInstall: mode === "chromium" && deferredPrompt !== null,
      install,
    }),
    [mode, deferredPrompt, install],
  );

  return <InstallContext.Provider value={value}>{children}</InstallContext.Provider>;
}

const chipClass =
  "mono text-xs uppercase rounded-full px-3 py-2 transition-colors hover:bg-[var(--ink-3)] shrink-0";

const chipStyle = { color: "var(--paper-dim)", border: "1px solid var(--line-2)" };

function InstallChip({ className }: { className: string }) {
  const { install } = useInstall();
  return (
    <button type="button" onClick={install} className={`${chipClass} ${className}`} style={chipStyle}>
      Zainstaluj
    </button>
  );
}

export default function InstallButton() {
  const { canInstall } = useInstall();
  if (!canInstall) return null;
  // The wordmark fits beside the hamburger below lg, and beside the looser xl row.
  // From lg to xl the nine links already fill the bar (UX-11), so this chip stays out of that row.
  return <InstallChip className="hidden max-lg:inline-flex xl:inline-flex" />;
}

function ShareIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

export function InstallBand() {
  const { mode, canInstall } = useInstall();

  if (mode === "ios") {
    return (
      <p
        className="flex items-center gap-2 m-0 px-4 xl:px-10 pb-3 lg:pb-4 min-w-0 max-w-full mono text-xs leading-snug"
        style={{ color: "var(--paper-mute)" }}
      >
        <ShareIcon />
        <span className="min-w-0">Udostępnij → Ekran początkowy</span>
      </p>
    );
  }

  if (!canInstall) return null;

  return (
    <div className="hidden lg:flex xl:hidden items-center justify-end gap-3 px-4 pb-3 min-w-0 max-w-full">
      <p className="mono text-xs m-0 min-w-0" style={{ color: "var(--paper-mute)" }}>
        Dodaj aplikację
      </p>
      <InstallChip className="inline-flex" />
    </div>
  );
}
