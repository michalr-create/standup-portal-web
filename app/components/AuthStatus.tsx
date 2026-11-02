"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { getBrowserSupabase } from "@/lib/supabase-browser";

type Variant = "nav" | "drawer";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]";

const bareButton = "m-0 cursor-pointer border-0 bg-transparent font-[inherit]";

function ZalogujLink({ className, onNavigate }: { className: string; onNavigate?: () => void }) {
  return (
    <Link href="/zaloguj" onClick={onNavigate} className={className} style={{ color: "var(--paper)" }}>
      Zaloguj
    </Link>
  );
}

function SignOutButton({ className }: { className: string }) {
  return (
    <form action={signOut} className="m-0">
      <button type="submit" className={`${bareButton} ${className}`} style={{ color: "var(--paper)" }}>
        Wyloguj
      </button>
    </form>
  );
}

export default function AuthStatus({
  variant = "nav",
  onNavigate,
}: {
  variant?: Variant;
  onNavigate?: () => void;
}) {
  const [signedIn, setSignedIn] = useState(false);
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  if (variant === "drawer") {
    const itemClass = `flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-3 text-left text-sm font-semibold hover:bg-[var(--ink-3)] ${focusRing}`;
    if (!signedIn) {
      return (
        <ZalogujLink
          onNavigate={onNavigate}
          className={itemClass}
        />
      );
    }
    return (
      <div className="flex flex-col">
        <Link href="/ulubione" onClick={onNavigate} className={itemClass} style={{ color: "var(--paper)" }}>
          Ulubione
        </Link>
        <SignOutButton className={itemClass} />
      </div>
    );
  }

  const chipClass = `${bareButton} inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm font-semibold hover:bg-[var(--ink-3)] ${focusRing}`;

  if (!signedIn) {
    return (
      <ZalogujLink
        className={chipClass}
      />
    );
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        className={chipClass}
        style={{ color: "var(--paper)" }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        Konto
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Konto"
          className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-40 rounded-xl p-1"
          style={{ background: "var(--ink-2)", border: "1px solid var(--line-2)" }}
        >
          <Link
            href="/ulubione"
            role="menuitem"
            className={`flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold hover:bg-[var(--ink-3)] ${focusRing}`}
            style={{ color: "var(--paper)" }}
            onClick={() => setOpen(false)}
          >
            Ulubione
          </Link>
          <SignOutButton
            className={`flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm font-semibold hover:bg-[var(--ink-3)] ${focusRing}`}
          />
        </div>
      )}
    </div>
  );
}
