"use client";

import { useState } from "react";
import Link from "next/link";
import { attendanceMode, goingCountLabel, shownGoingCount } from "@/lib/event-plans";
import { useEventPlans } from "./EventPlansProvider";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]";

const buttonClass = `inline-flex min-h-11 items-center rounded-full px-3 text-sm font-black ${focusRing}`;

function loginHref(): string {
  if (typeof window === "undefined") return "/zaloguj?next=/trasy";
  const next = `${window.location.pathname}${window.location.search}`;
  return `/zaloguj?next=${encodeURIComponent(next)}`;
}

export default function EventPlanActions({
  eventId,
  startsAt,
  goingCount,
}: {
  eventId: number;
  startsAt: string;
  goingCount: number;
}) {
  const plans = useEventPlans();
  const [error, setError] = useState<string | null>(null);
  const mode = attendanceMode(startsAt, new Date());
  const signedIn = plans?.signedIn ?? false;
  const reminded = plans?.reminders.has(eventId) ?? false;
  const going = plans?.going.has(eventId) ?? false;
  const attended = plans?.attended.has(eventId) ?? false;
  const wasGoing = plans?.initialGoing.has(eventId) ?? false;
  const count = plans?.ready
    ? shownGoingCount(goingCount, wasGoing, going)
    : Math.max(0, goingCount);
  const countLabel = goingCountLabel(count);
  const quiet = { color: "var(--paper)", background: "transparent", border: "1px solid var(--line-2)" };
  const hot = { color: "var(--ink)", background: "var(--coral)", border: "1px solid var(--coral)" };

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={`/api/wydarzenia/${eventId}/kalendarz`}
          className={buttonClass}
          style={quiet}
        >
          Dodaj do kalendarza
        </a>
        {signedIn ? (
          <button
            type="button"
            className={buttonClass}
            style={reminded ? hot : quiet}
            aria-pressed={reminded}
            onClick={() => {
              if (!plans) return;
              setError(null);
              void plans.toggleReminder(eventId).then((result) => {
                if (!result.ok) setError(result.error);
              });
            }}
          >
            {reminded ? "Przypomnienie zapisane" : "Przypomnij mi"}
          </button>
        ) : (
          <Link href={loginHref()} className={buttonClass} style={quiet}>
            Przypomnij mi
          </Link>
        )}
        {signedIn ? (
          <button
            type="button"
            className={buttonClass}
            style={(mode === "going" ? going : attended) ? hot : quiet}
            aria-pressed={mode === "going" ? going : attended}
            onClick={() => {
              if (!plans) return;
              setError(null);
              void plans.toggleAttendance(eventId, mode).then((result) => {
                if (!result.ok) setError(result.error);
              });
            }}
          >
            {mode === "attended" ? "Byłem" : "Idę"}
          </button>
        ) : (
          <Link href={loginHref()} className={buttonClass} style={quiet}>
            {mode === "attended" ? "Byłem" : "Idę"}
          </Link>
        )}
        {countLabel && (
          <span className="text-sm font-semibold" style={{ color: "var(--paper-dim)" }}>
            {countLabel}
          </span>
        )}
      </div>
      {error && (
        <p role="alert" className="m-0 text-sm font-semibold" style={{ color: "var(--coral)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
