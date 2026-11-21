"use client";

import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { clearAccountLibrary, type KeyValueStore } from "@/lib/library-storage";

type Props = {
  className?: string;
  style?: CSSProperties;
};

function browserStore(): KeyValueStore | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export default function SignOutButton({ className, style }: Props) {
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);

  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      if (pendingRef.current) {
        window.location.reload();
        return;
      }
      setPending(false);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    const form = event.currentTarget;
    const store = browserStore();
    if (store) clearAccountLibrary(store);
    // Paint „Wylogowuję…” before the document POST. Disabling the submit
    // button inside the submit event would cancel that navigation.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        form.submit();
      });
    });
  };

  return (
    <form action="/auth/signout" method="post" className="m-0" onSubmit={onSubmit}>
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className={`m-0 cursor-pointer border-0 bg-transparent font-[inherit] disabled:cursor-wait disabled:opacity-70 ${className ?? ""}`}
        style={style}
      >
        {pending ? (
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent"
              aria-hidden="true"
            />
            Wylogowuję…
          </span>
        ) : (
          "Wyloguj"
        )}
      </button>
    </form>
  );
}
