"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { loadMyPlans, setReminder } from "@/app/konto/place-actions";
import { getBrowserSupabase } from "@/lib/supabase-browser";

type PlanResult = { ok: true } | { ok: false; error: string };

type EventPlans = {
  signedIn: boolean;
  reminders: ReadonlySet<number>;
  toggleReminder: (eventId: number) => Promise<PlanResult>;
};

const EventPlansContext = createContext<EventPlans | null>(null);

export function useEventPlans(): EventPlans | null {
  return useContext(EventPlansContext);
}

function parseIds(key: string): number[] {
  if (!key) return [];
  return key.split(",").map((value) => Number(value)).filter((id) => Number.isSafeInteger(id) && id > 0);
}

export default function EventPlansProvider({
  eventIds,
  children,
}: {
  eventIds: number[];
  children: ReactNode;
}) {
  const key = eventIds.join(",");
  const [signedIn, setSignedIn] = useState(false);
  const [reminders, setReminders] = useState<ReadonlySet<number>>(new Set());
  const signedInRef = useRef(false);
  const remindersRef = useRef(reminders);
  const generation = useRef(0);
  remindersRef.current = reminders;

  useEffect(() => {
    const ids = parseIds(key);
    let cancelled = false;
    const supabase = getBrowserSupabase();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user.id ?? null;
      setTimeout(() => {
        if (cancelled) return;
        signedInRef.current = Boolean(userId);
        setSignedIn(Boolean(userId));
        if (!userId) {
          setReminders(new Set());
          return;
        }
        void loadMyPlans(ids).then((result) => {
          if (cancelled || !result.ok) return;
          setReminders(new Set(result.reminders));
        });
      }, 0);
    });
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, [key]);

  const toggleReminder = useCallback(async (eventId: number): Promise<PlanResult> => {
    if (!signedInRef.current) return { ok: false, error: "Zaloguj się, żeby dostać przypomnienie." };
    const gen = ++generation.current;
    const on = !remindersRef.current.has(eventId);
    const nextReminders = new Set(remindersRef.current);
    if (on) nextReminders.add(eventId);
    else nextReminders.delete(eventId);
    remindersRef.current = nextReminders;
    setReminders(nextReminders);
    const result = await setReminder(eventId, on);
    if (!result.ok && generation.current === gen) {
      const reverted = new Set(remindersRef.current);
      if (on) reverted.delete(eventId);
      else reverted.add(eventId);
      remindersRef.current = reverted;
      setReminders(reverted);
    }
    return result.ok ? { ok: true } : result;
  }, []);

  const value = useMemo<EventPlans>(() => ({
    signedIn,
    reminders,
    toggleReminder,
  }), [signedIn, reminders, toggleReminder]);

  return <EventPlansContext.Provider value={value}>{children}</EventPlansContext.Provider>;
}
