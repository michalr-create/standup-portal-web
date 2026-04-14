"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Detekcja iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const iOS =
      /iphone|ipad|ipod/.test(ua) ||
      (ua.includes("mac") && "ontouchend" in document);
    setIsIOS(iOS);

    // Detekcja czy juz zainstalowane (uruchomione jako PWA)
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error - Safari iOS specific
      window.navigator.standalone === true;
    setIsStandalone(standalone);

    // Obsluga eventu beforeinstallprompt (Android/Chrome/Edge)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  // Nie renderuj nic dopoki komponent sie nie zamontuje
  if (!mounted) return null;

  // Juz zainstalowane - nie pokazuj przycisku
  if (isStandalone) return null;

  // Desktop bez promptu i bez iOS - nie pokazuj
  if (!deferredPrompt && !isIOS) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Android - uruchom natywny prompt instalacji
      await deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === "accepted") {
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      // iOS - pokaz instrukcje manualna
      setShowIOSModal(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="px-4 py-2 bg-white text-black text-sm font-medium rounded-full hover:bg-gray-200 transition-colors"
      >
        Zainstaluj aplikacje
      </button>

      {showIOSModal && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setShowIOSModal(false)}
        >
          <div
            className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 max-w-sm w-full text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">
              Zainstaluj parska na iPhone
            </h2>
            <ol className="space-y-3 text-sm text-gray-300">
              <li>
                1. Stuknij przycisk <strong className="text-white">udostepniania</strong> na
                dole ekranu Safari (kwadrat ze strzalka w gore)
              </li>
              <li>
                2. Przewin w dol i wybierz{" "}
                <strong className="text-white">Do ekranu poczatkowego</strong>
              </li>
              <li>
                3. Stuknij <strong className="text-white">Dodaj</strong> w prawym
                gornym rogu
              </li>
            </ol>
            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-6 w-full py-2 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors"
            >
              Zamknij
            </button>
          </div>
        </div>
      )}
    </>
  );
}
