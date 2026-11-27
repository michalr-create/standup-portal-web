"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { calendarLinks } from "@/lib/calendar-links";
import { trackParska } from "@/lib/analytics";
import { useEventPlans } from "./EventPlansProvider";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]";

const buttonClass = `inline-flex min-h-11 items-center rounded-full px-3 text-sm font-black ${focusRing}`;

function loginHref(path: string): string {
  return `/zaloguj?next=${encodeURIComponent(path)}`;
}

function useLoginHref(): string {
  const [href, setHref] = useState(loginHref("/trasy"));
  useEffect(() => {
    setHref(loginHref(`${window.location.pathname}${window.location.search}`));
  }, []);
  return href;
}

type CalendarOption = {
  href: string;
  label: string;
  external: boolean;
  calendar: "google" | "outlook" | "ics";
  icsVariant?: "apple" | "other";
};

function calendarOptions(event: {
  eventId: number;
  title?: string | null;
  startsAt: string;
  city?: string | null;
  venue?: string | null;
  ticketUrl?: string | null;
}): CalendarOption[] {
  const links = calendarLinks({
    id: event.eventId,
    title: event.title,
    startsAt: event.startsAt,
    city: event.city,
    venue: event.venue,
    ticketUrl: event.ticketUrl,
  });
  const options: Array<CalendarOption | null> = [
    links.google ? { href: links.google, label: "Google Kalendarz", external: true, calendar: "google" } : null,
    links.outlook ? { href: links.outlook, label: "Outlook", external: true, calendar: "outlook" } : null,
    links.ics ? { href: links.ics, label: "Apple / iPhone", external: false, calendar: "ics", icsVariant: "apple" } : null,
    links.ics ? { href: links.ics, label: "Inny kalendarz (.ics)", external: false, calendar: "ics", icsVariant: "other" } : null,
  ];
  return options.filter((option): option is CalendarOption => option != null);
}

function CalendarAddMenu({
  eventId,
  title,
  startsAt,
  city,
  venue,
  ticketUrl,
}: {
  eventId: number;
  title?: string | null;
  startsAt: string;
  city?: string | null;
  venue?: string | null;
  ticketUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const menuId = useId();
  const options = calendarOptions({ eventId, title, startsAt, city, venue, ticketUrl });
  const quiet = { color: "var(--paper)", background: "transparent", border: "1px solid var(--line-2)" };

  const reveal = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    const needed = options.length * 44 + 16;
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom;
      setDropUp(spaceBelow < needed + 8 && rect.top > needed + 8);
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    itemRefs.current.find((node) => node)?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && rootRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const moveFocus = (next: number) => {
    const nodes = itemRefs.current.filter((node): node is HTMLAnchorElement => node != null && node.isConnected);
    if (nodes.length === 0) return;
    const index = ((next % nodes.length) + nodes.length) % nodes.length;
    nodes[index]?.focus();
  };

  return (
    <div
      ref={rootRef}
      className="relative"
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (next == null || (next instanceof Node && rootRef.current?.contains(next))) return;
        setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        className={buttonClass}
        style={quiet}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => {
          if (open) setOpen(false);
          else reveal();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            if (!open) reveal();
            else moveFocus(0);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            if (!open) reveal();
            else moveFocus(-1);
          }
        }}
      >
        Dodaj do kalendarza
      </button>
      {open && options.length > 0 && (
        <div
          id={menuId}
          role="menu"
          aria-label="Dodaj do kalendarza"
          className={`absolute left-0 z-30 flex min-w-56 flex-col rounded-2xl p-1 ${dropUp ? "bottom-full mb-2" : "top-full mt-2"}`}
          style={{ background: "var(--ink)", border: "1px solid var(--line-2)", boxShadow: "0 12px 32px rgba(0,0,0,.45)" }}
          onMouseDown={(event) => event.preventDefault()}
          onKeyDown={(event) => {
            const nodes = itemRefs.current.filter((node): node is HTMLAnchorElement => node != null && node.isConnected);
            const index = nodes.findIndex((node) => node === document.activeElement);
            if (event.key === "ArrowDown") {
              event.preventDefault();
              moveFocus(index < 0 ? 0 : index + 1);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              moveFocus(index < 0 ? -1 : index - 1);
            } else if (event.key === "Home") {
              event.preventDefault();
              moveFocus(0);
            } else if (event.key === "End") {
              event.preventDefault();
              moveFocus(nodes.length - 1);
            }
          }}
        >
          {options.map((option, index) => (
            <a
              key={option.label}
              ref={(node) => {
                itemRefs.current[index] = node;
              }}
              role="menuitem"
              href={option.href}
              className={`flex min-h-11 items-center rounded-xl px-3 text-sm font-bold hover:bg-[var(--ink-4)] ${focusRing}`}
              style={{ color: "var(--paper)" }}
              {...(option.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              onClick={() => {
                trackParska("dodaj_do_kalendarza", {
                  event_id: eventId,
                  calendar: option.calendar,
                  ...(option.icsVariant ? { ics_variant: option.icsVariant } : {}),
                });
                setOpen(false);
              }}
            >
              {option.label}
              {option.external && <span className="sr-only">, otwiera się w nowej karcie</span>}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EventPlanActions({
  eventId,
  title,
  startsAt,
  city,
  venue,
  ticketUrl,
}: {
  eventId: number;
  title?: string | null;
  startsAt: string;
  city?: string | null;
  venue?: string | null;
  ticketUrl?: string | null;
}) {
  const plans = useEventPlans();
  const loginTo = useLoginHref();
  const [error, setError] = useState<string | null>(null);
  const signedIn = plans?.signedIn ?? false;
  const reminded = plans?.reminders.has(eventId) ?? false;
  const quiet = { color: "var(--paper)", background: "transparent", border: "1px solid var(--line-2)" };
  const hot = { color: "var(--ink)", background: "var(--coral)", border: "1px solid var(--coral)" };

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <CalendarAddMenu
          eventId={eventId}
          title={title}
          startsAt={startsAt}
          city={city}
          venue={venue}
          ticketUrl={ticketUrl}
        />
        {signedIn ? (
          <button
            type="button"
            className={buttonClass}
            style={reminded ? hot : quiet}
            aria-pressed={reminded}
            onClick={() => {
              if (!plans) return;
              setError(null);
              const action = reminded ? "remove" : "add";
              void plans.toggleReminder(eventId).then((result) => {
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                trackParska("przypomnij_mi", { event_id: eventId, action });
              });
            }}
          >
            {reminded ? "Przypomnienie zapisane" : "Przypomnij mi"}
          </button>
        ) : (
          <Link href={loginTo} className={buttonClass} style={quiet}>
            Przypomnij mi
          </Link>
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
