"use client";

import { useEffect, useRef, useState } from "react";
import { getConsent, hasConsent, saveConsent, CONSENT_CHANGED_EVENT } from "@/lib/consent";
import { shouldMountYoutubePlayer } from "@/lib/youtube-embed";

export function useYoutubeGate(videoId: string) {
  const [embedsConsent, setEmbedsConsent] = useState(false);
  const [explicitPlay, setExplicitPlay] = useState(false);
  const [remember, setRemember] = useState(false);
  const embedsRef = useRef(false);

  useEffect(() => {
    const sync = () => {
      const next = hasConsent("embeds");
      if (embedsRef.current && !next) setExplicitPlay(false);
      embedsRef.current = next;
      setEmbedsConsent(next);
    };
    sync();
    document.addEventListener(CONSENT_CHANGED_EVENT, sync);
    return () => document.removeEventListener(CONSENT_CHANGED_EVENT, sync);
  }, []);

  useEffect(() => {
    setExplicitPlay(false);
    setRemember(false);
  }, [videoId]);

  const start = () => {
    if (remember) {
      const current = getConsent();
      saveConsent({
        functional: current?.functional ?? false,
        analytics: current?.analytics ?? false,
        embeds: true,
      });
    }
    setExplicitPlay(true);
  };

  return {
    mounted: shouldMountYoutubePlayer({ embedsConsent, explicitPlay }),
    explicitPlay,
    remember,
    setRemember,
    start,
  };
}
