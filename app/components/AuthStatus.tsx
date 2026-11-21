"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    const supabase = getBrowserSupabase();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

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
    <Link href="/ulubione" className={chipClass} style={{ color: "var(--paper)" }}>
      Konto
    </Link>
  );
}
