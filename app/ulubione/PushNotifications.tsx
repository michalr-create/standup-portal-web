"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLibrary } from "@/app/components/LibraryProvider";
import { iosNeedsHomeScreen, subscribeForPush } from "@/lib/push-client";
import type { PushPrefs } from "@/lib/push-dispatch";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

const DEFAULTS: PushPrefs = {
  newContentFavorites: true,
  eventsHomeCity: true,
  eventsFavorites: true,
  eventReminders: true,
};

type PrefKey = keyof PushPrefs;

const PREF_ROWS: { key: PrefKey; label: string }[] = [
  { key: "newContentFavorites", label: "Nowe materiały ulubionych" },
  { key: "eventsHomeCity", label: "Nowe występy w moim mieście" },
  { key: "eventsFavorites", label: "Nowe występy ulubionych" },
  { key: "eventReminders", label: "Przypomnienie dobę przed terminem" },
];

function readIosBlocked(): boolean {
  const standalone = window.matchMedia("(display-mode: standalone)").matches
    || window.matchMedia("(display-mode: minimal-ui)").matches;
  return iosNeedsHomeScreen({
    userAgent: window.navigator.userAgent,
    platform: window.navigator.platform,
    maxTouchPoints: window.navigator.maxTouchPoints,
    displayStandalone: standalone,
    navigatorStandalone: (window.navigator as Navigator & { standalone?: boolean }).standalone === true,
  });
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await response.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export default function PushNotifications() {
  const library = useLibrary();
  const [envReady, setEnvReady] = useState(false);
  const [iosBlocked, setIosBlocked] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const [denied, setDenied] = useState(false);
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<PushPrefs>(DEFAULTS);
  const [prefsReady, setPrefsReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadPushSettings() {
      const blocked = readIosBlocked();
      const support = "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
      if (cancelled) return;
      setIosBlocked(blocked);
      setUnsupported(!support && !blocked);
      setDenied(support && Notification.permission === "denied");
      setEnvReady(true);
      if (!library.ready || !library.signedIn) {
        setPrefsReady(true);
        return;
      }
      try {
        const response = await fetch("/api/push/prefs");
        const body = await readJson(response);
        if (cancelled) return;
        if (response.ok) {
          setPrefs({
            newContentFavorites: body.newContentFavorites !== false,
            eventsHomeCity: body.eventsHomeCity !== false,
            eventsFavorites: body.eventsFavorites !== false,
            eventReminders: body.eventReminders !== false,
          });
        }
      } catch {
        if (!cancelled) setError("Nie udało się wczytać ustawień.");
      } finally {
        if (!cancelled) setPrefsReady(true);
      }
      if (!support || blocked || Notification.permission !== "granted") return;
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        const subscription = await registration.pushManager.getSubscription();
        if (!cancelled) setEndpoint(subscription?.endpoint ?? null);
      } catch {
        if (!cancelled) setEndpoint(null);
      }
    }
    void loadPushSettings();
    return () => {
      cancelled = true;
    };
  }, [library.ready, library.signedIn]);

  async function enableOnThisDevice() {
    if (iosBlocked || busy) return;
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const result = await subscribeForPush({
        vapidPublicKey: VAPID_PUBLIC_KEY,
        requestPermission: () => Notification.requestPermission(),
        registerWorker: async () => {
          const registration = await navigator.serviceWorker.register("/sw.js");
          await navigator.serviceWorker.ready;
          return {
            subscribe: async (applicationServerKey) => {
              const existing = await registration.pushManager.getSubscription();
              if (existing) await existing.unsubscribe();
              const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey,
              });
              const json = subscription.toJSON();
              return { endpoint: json.endpoint, keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth } };
            },
          };
        },
      });
      if (!result.ok) {
        if (result.error === "denied") setDenied(true);
        setError(
          result.error === "missing_key"
            ? "Powiadomienia nie są jeszcze włączone na serwerze."
            : result.error === "denied"
              ? "Przeglądarka nie dała zgody na powiadomienia."
              : "Nie udało się włączyć powiadomień na tym urządzeniu.",
        );
        return;
      }
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: result.endpoint, keys: { p256dh: result.p256dh, auth: result.auth } }),
      });
      if (!response.ok) {
        setError("Nie udało się zapisać tego urządzenia.");
        return;
      }
      setEndpoint(result.endpoint);
      setDenied(false);
      setNote("Włączone na tym urządzeniu.");
    } catch {
      setError("Nie udało się włączyć powiadomień na tym urządzeniu.");
    } finally {
      setBusy(false);
    }
  }

  async function disableOnThisDevice() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      const subscription = await registration?.pushManager.getSubscription();
      const current = subscription?.endpoint ?? endpoint;
      if (current) {
        const response = await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: current }),
        });
        if (!response.ok) {
          setError("Nie udało się wyłączyć powiadomień.");
          return;
        }
      }
      if (subscription) await subscription.unsubscribe();
      setEndpoint(null);
      setNote("Wyłączone na tym urządzeniu.");
    } catch {
      setError("Nie udało się wyłączyć powiadomień.");
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    if (!endpoint || busy) return;
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const response = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });
      if (!response.ok) {
        setError(response.status === 410 ? "To urządzenie nie jest już zapisane. Włącz powiadomienia jeszcze raz." : "Nie udało się wysłać testu.");
        return;
      }
      setNote("Wysłane. Jeśli nic nie przyszło, sprawdź wyciszenie systemu.");
    } catch {
      setError("Nie udało się wysłać testu.");
    } finally {
      setBusy(false);
    }
  }

  async function togglePref(key: PrefKey) {
    if (!prefsReady || busy) return;
    const previous = prefs;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setError(null);
    const response = await fetch("/api/push/prefs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    if (!response.ok) {
      setPrefs(previous);
      setError("Nie udało się zapisać ustawień.");
    }
  }

  const enabled = Boolean(endpoint);

  return (
    <section className="mb-10" aria-labelledby="powiadomienia">
      <h2 id="powiadomienia" className="font-black mb-2" style={{ fontSize: "18px", letterSpacing: "-.01em" }}>
        Powiadomienia
        <span className="dot-accent">.</span>
      </h2>
      {!library.ready || !envReady ? (
        <p className="m-0 text-sm" style={{ color: "var(--paper-mute)" }}>Ładowanie…</p>
      ) : !library.signedIn ? (
        <p className="m-0 text-sm" style={{ color: "var(--paper-dim)" }}>
          <Link href="/zaloguj?next=/ulubione" className={`font-bold ${focusRing}`} style={{ color: "var(--coral)" }}>
            Zaloguj się
          </Link>
          , żeby włączyć powiadomienia na telefonie albo komputerze.
        </p>
      ) : (
        <div className="flex max-w-lg flex-col gap-4">
          <p className="m-0 text-sm" style={{ color: "var(--paper-dim)" }}>
            Nowe materiały ulubionych, nowe występy i przypomnienie około doby przed zapisanym terminem.
          </p>
          {iosBlocked ? (
            <p className="m-0 text-sm" style={{ color: "var(--paper)" }}>
              Na iPhonie i iPadzie push działa dopiero w aplikacji z ekranu początkowego. Udostępnij → Ekran początkowy, otwórz parskę z ikony i włącz powiadomienia tutaj.
            </p>
          ) : unsupported ? (
            <p className="m-0 text-sm" style={{ color: "var(--paper-mute)" }}>
              Ta przeglądarka nie obsługuje powiadomień push.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {enabled ? (
                <button
                  type="button"
                  className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-black ${focusRing}`}
                  style={{ color: "var(--coral)", background: "transparent", border: "1px solid var(--coral)" }}
                  onClick={() => void disableOnThisDevice()}
                  disabled={busy}
                >
                  Wyłącz na tym urządzeniu
                </button>
              ) : (
                <button
                  type="button"
                  className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-black ${focusRing}`}
                  style={{ color: "var(--ink)", background: "var(--paper)", border: "1px solid var(--paper)" }}
                  onClick={() => void enableOnThisDevice()}
                  disabled={busy || denied || !VAPID_PUBLIC_KEY}
                >
                  Włącz na tym urządzeniu
                </button>
              )}
              <button
                type="button"
                className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-black ${focusRing}`}
                style={{ color: "var(--paper)", border: "1px solid var(--line-2)", opacity: enabled && !busy ? 1 : 0.5 }}
                onClick={() => void sendTest()}
                disabled={!enabled || busy}
              >
                Wyślij testowe
              </button>
            </div>
          )}
          {denied && (
            <p className="m-0 text-sm" style={{ color: "var(--paper-mute)" }}>
              Przeglądarka zablokowała powiadomienia. Zezwól na nie w ustawieniach witryny.
            </p>
          )}
          {!VAPID_PUBLIC_KEY && !iosBlocked && (
            <p className="m-0 text-sm" style={{ color: "var(--paper-mute)" }}>
              Powiadomienia nie są jeszcze włączone na serwerze.
            </p>
          )}
          <div className="flex flex-col">
            {PREF_ROWS.map((row) => (
              <button
                key={row.key}
                type="button"
                role="switch"
                aria-checked={prefs[row.key]}
                disabled={!prefsReady || busy}
                onClick={() => void togglePref(row.key)}
                className={`flex min-h-11 w-full items-center justify-between gap-4 rounded-2xl px-1 text-left ${focusRing}`}
                style={{ background: "transparent", border: 0, color: "var(--paper)", opacity: prefsReady ? 1 : 0.6 }}
              >
                <span className="text-sm font-semibold">{row.label}</span>
                <span
                  aria-hidden="true"
                  className="relative h-7 w-12 shrink-0 rounded-full"
                  style={{ background: prefs[row.key] ? "var(--coral)" : "var(--ink-4)", border: "1px solid var(--line-2)" }}
                >
                  <span
                    className="absolute top-0.5 h-5 w-5 rounded-full"
                    style={{ left: prefs[row.key] ? "22px" : "2px", background: "var(--paper)", transition: "left .15s" }}
                  />
                </span>
              </button>
            ))}
          </div>
          {note && <p className="m-0 text-sm" style={{ color: "var(--paper-dim)" }}>{note}</p>}
          {error && (
            <p role="alert" className="m-0 text-sm font-semibold" style={{ color: "var(--coral)" }}>{error}</p>
          )}
        </div>
      )}
    </section>
  );
}
