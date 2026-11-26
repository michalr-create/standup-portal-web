"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CONSENT_CHANGED_EVENT,
  OPEN_CONSENT_EVENT,
  acceptAllConsent,
  getConsent,
  rejectOptionalConsent,
  saveConsent,
  type ConsentChoice,
} from "@/lib/consent";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]";

const choiceButton =
  `inline-flex min-h-11 flex-1 items-center justify-center rounded-full px-4 text-center text-sm font-black ${focusRing}`;

const choiceStyle = {
  color: "var(--paper)",
  background: "transparent",
  border: "1px solid var(--line-2)",
} as const;

type Layer = "hidden" | "notice" | "settings";

type Toggles = {
  functional: boolean;
  analytics: boolean;
  embeds: boolean;
};

function togglesFrom(choice: ConsentChoice | null): Toggles {
  return {
    functional: choice?.functional ?? false,
    analytics: choice?.analytics ?? false,
    embeds: choice?.embeds ?? false,
  };
}

function Switch({
  id,
  label,
  detail,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  detail: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3" style={{ borderTop: "1px solid var(--line)" }}>
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm font-black" style={{ color: "var(--paper)" }}>
          {label}
        </label>
        <p id={`${id}-detail`} className="m-0 mt-1 text-sm leading-relaxed" style={{ color: "var(--paper-dim)" }}>
          {detail}
        </p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={`${id}-detail`}
        disabled={disabled}
        className={`relative mt-1 inline-flex h-7 w-12 shrink-0 items-center rounded-full ${focusRing} disabled:cursor-not-allowed disabled:opacity-70`}
        style={{ background: checked ? "var(--coral)" : "var(--ink-4)", border: "1px solid var(--line-2)" }}
        onClick={() => onChange?.(!checked)}
      >
        <span
          aria-hidden="true"
          className="inline-block h-5 w-5 rounded-full transition-transform"
          style={{
            background: "var(--paper)",
            transform: checked ? "translateX(22px)" : "translateX(2px)",
          }}
        />
        <span className="sr-only">{checked ? "włączone" : "wyłączone"}</span>
      </button>
    </div>
  );
}

export default function ConsentBanner() {
  const pathname = usePathname();
  const titleId = useId();
  const bodyId = useId();
  const [layer, setLayer] = useState<Layer>("hidden");
  const [ready, setReady] = useState(false);
  const [toggles, setToggles] = useState<Toggles>({ functional: false, analytics: false, embeds: false });

  useEffect(() => {
    const stored = getConsent();
    setToggles(togglesFrom(stored));
    setLayer(stored ? "hidden" : "notice");
    setReady(true);
    const onOpen = () => {
      setToggles(togglesFrom(getConsent()));
      setLayer("settings");
    };
    document.addEventListener(OPEN_CONSENT_EVENT, onOpen);
    return () => document.removeEventListener(OPEN_CONSENT_EVENT, onOpen);
  }, []);

  useEffect(() => {
    const sync = () => {
      const stored = getConsent();
      setToggles(togglesFrom(stored));
      if (stored) setLayer("hidden");
    };
    document.addEventListener(CONSENT_CHANGED_EVENT, sync);
    return () => document.removeEventListener(CONSENT_CHANGED_EVENT, sync);
  }, []);

  useEffect(() => {
    if (layer === "hidden") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (layer === "settings") {
        const stored = getConsent();
        if (stored) {
          setLayer("hidden");
          return;
        }
        setLayer("notice");
        return;
      }
      rejectOptionalConsent();
      setLayer("hidden");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [layer]);

  if (!ready || layer === "hidden" || pathname.startsWith("/admin")) return null;

  const save = () => {
    saveConsent(toggles);
    setLayer("hidden");
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[45] px-3 pb-3 sm:px-4"
      style={{ pointerEvents: "none" }}
    >
      <section
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="mx-auto w-full max-w-3xl rounded-[18px] px-4 py-4 sm:px-5"
        style={{
          pointerEvents: "auto",
          background: "var(--ink-2)",
          border: "1px solid var(--line-2)",
          boxShadow: "0 16px 40px rgba(0,0,0,.45)",
        }}
      >
        <h2 id={titleId} className="m-0 text-base font-black" style={{ letterSpacing: "-.02em" }}>
          {layer === "settings" ? "Ustawienia cookies" : "Cookies na parska.pl"}
          <span className="dot-accent">.</span>
        </h2>
        {layer === "notice" ? (
          <>
            <p id={bodyId} className="m-0 mt-2 text-sm leading-relaxed" style={{ color: "var(--paper-dim)" }}>
              Używamy niezbędnych cookies, żeby strona działała (m.in. logowanie). Analityka (Vercel, bez ciasteczek) i zapamiętanie ulubionych w przeglądarce działają po Twojej zgodzie. Filmy odtwarzamy przez YouTube — player wczytamy dopiero po zgodzie albo po kliknięciu „Odtwórz”.{" "}
              Szczegóły:{" "}
              <Link href="/polityka-prywatnosci" className={`font-bold underline-offset-4 hover:underline ${focusRing}`} style={{ color: "var(--coral)" }}>
                Polityka prywatności
              </Link>
              {", "}
              <Link href="/cookies" className={`font-bold underline-offset-4 hover:underline ${focusRing}`} style={{ color: "var(--coral)" }}>
                Cookies
              </Link>
              {", "}
              <Link href="/regulamin" className={`font-bold underline-offset-4 hover:underline ${focusRing}`} style={{ color: "var(--coral)" }}>
                Regulamin
              </Link>
              .
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                className={choiceButton}
                style={choiceStyle}
                onClick={() => {
                  rejectOptionalConsent();
                  setLayer("hidden");
                }}
              >
                Odrzuć opcjonalne
              </button>
              <button
                type="button"
                className={choiceButton}
                style={choiceStyle}
                onClick={() => {
                  acceptAllConsent();
                  setLayer("hidden");
                }}
              >
                Akceptuj wszystkie
              </button>
              <button type="button" className={choiceButton} style={choiceStyle} onClick={() => setLayer("settings")}>
                Ustawienia
              </button>
            </div>
          </>
        ) : (
          <>
            <p id={bodyId} className="m-0 mt-2 text-sm leading-relaxed" style={{ color: "var(--paper-dim)" }}>
              Niezbędne cookies zostają włączone. Resztę włączasz osobno. Zapis pamiętamy przez 12 miesięcy na tym urządzeniu.
            </p>
            <div className="mt-2">
              <Switch
                id="consent-necessary"
                label="Niezbędne"
                detail="Logowanie i zapis tej decyzji. Zawsze włączone."
                checked
                disabled
              />
              <Switch
                id="consent-functional"
                label="Funkcjonalne"
                detail="Ulubione i lista „do obejrzenia” w tej przeglądarce, gdy nie jesteś zalogowany."
                checked={toggles.functional}
                onChange={(functional) => setToggles((current) => ({ ...current, functional }))}
              />
              <Switch
                id="consent-analytics"
                label="Analityczne"
                detail="Vercel Web Analytics, bez ciasteczek, oraz własny licznik kliknięć. Bez e-maila i bez identyfikatora konta."
                checked={toggles.analytics}
                onChange={(analytics) => setToggles((current) => ({ ...current, analytics }))}
              />
              <Switch
                id="consent-embeds"
                label="Osadzenia (YouTube)"
                detail="Odtwarzacz YouTube w oknie parska.pl. Bez tej zgody film startuje dopiero po kliknięciu „Odtwórz”."
                checked={toggles.embeds}
                onChange={(embeds) => setToggles((current) => ({ ...current, embeds }))}
              />
              <Switch
                id="consent-marketing"
                label="Marketingowe"
                detail="Obecnie nieużywane. Nie ustawiamy pikseli reklamowych."
                checked={false}
                disabled
              />
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button type="button" className={choiceButton} style={choiceStyle} onClick={save}>
                Zapisz wybór
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
