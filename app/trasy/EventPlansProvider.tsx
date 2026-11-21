"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { loadMyPlans, setAttendance, setReminder } from "@/app/konto/place-actions";
import type { AttendanceMode } from "@/lib/event-plans";
import { getBrowserSupabase } from "@/lib/supabase-browser";

type PlanResult = { ok: true } | { ok: false; error: string };

type EventPlans = {
  ready: boolean;
  signedIn: boolean;
  reminders: ReadonlySet<number>;
  going: ReadonlySet<number>;
  attended: ReadonlySet<number>;
  initialGoing: ReadonlySet<number>;
  toggleReminder: (eventId: number) => Promise<PlanResult>;
  toggleAttendance: (eventId: number, mode: AttendanceMode) => Promise<PlanResult>;
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
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [reminders, setReminders] = useState<ReadonlySet<number>>(new Set());
  const [going, setGoing] = useState<ReadonlySet<number>>(new Set());
  const [attended, setAttended] = useState<ReadonlySet<number>>(new Set());
  const [initialGoing, setInitialGoing] = useState<ReadonlySet<number>>(new Set());
  const signedInRef = useRef(false);
  const remindersRef = useRef(reminders);
  const goingRef = useRef(going);
  const attendedRef = useRef(attended);
  const generation = useRef(0);
  remindersRef.current = reminders;
  goingRef.current = going;
  attendedRef.current = attended;

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
          setGoing(new Set());
          setAttended(new Set());
          setInitialGoing(new Set());
          setReady(true);
          return;
        }
        void loadMyPlans(ids).then((result) => {
          if (cancelled) return;
          if (!result.ok) {
            setReady(true);
            return;
          }
          const goingSet = new Set(result.going);
          setReminders(new Set(result.reminders));
          setGoing(goingSet);
          setAttended(new Set(result.attended));
          setInitialGoing(new Set(goingSet));
          setReady(true);
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

  const toggleAttendance = useCallback(async (eventId: number, mode: AttendanceMode): Promise<PlanResult> => {
    if (!signedInRef.current) return { ok: false, error: "Zaloguj się, żeby zapisać udział." };
    const gen = ++generation.current;
    const wasGoing = goingRef.current.has(eventId);
    const wasAttended = attendedRef.current.has(eventId);
    const turningOff = (mode === "going" && wasGoing) || (mode === "attended" && wasAttended);
    const nextGoing = new Set(goingRef.current);
    const nextAttended = new Set(attendedRef.current);
    if (mode === "going" && !turningOff) nextGoing.add(eventId);
    else nextGoing.delete(eventId);
    if (mode === "attended" && !turningOff) nextAttended.add(eventId);
    else nextAttended.delete(eventId);
    goingRef.current = nextGoing;
    attendedRef.current = nextAttended;
    setGoing(nextGoing);
    setAttended(nextAttended);
    const result = await setAttendance(eventId, turningOff ? null : mode);
    if (!result.ok && generation.current === gen) {
      const revertGoing = new Set(goingRef.current);
      const revertAttended = new Set(attendedRef.current);
      if (wasGoing) revertGoing.add(eventId);
      else revertGoing.delete(eventId);
      if (wasAttended) revertAttended.add(eventId);
      else revertAttended.delete(eventId);
      goingRef.current = revertGoing;
      attendedRef.current = revertAttended;
      setGoing(revertGoing);
      setAttended(revertAttended);
    }
    return result.ok ? { ok: true } : result;
  }, []);

  const value = useMemo<EventPlans>(() => ({
    ready,
    signedIn,
    reminders,
    going,
    attended,
    initialGoing,
    toggleReminder,
    toggleAttendance,
  }), [ready, signedIn, reminders, going, attended, initialGoing, toggleReminder, toggleAttendance]);

  return <EventPlansContext.Provider value={value}>{children}</EventPlansContext.Provider>;
}
