"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLibrary } from "@/app/components/LibraryProvider";
import { DELETE_ACCOUNT_PHRASE } from "@/lib/delete-account";
import { clearAccountLibrary, type KeyValueStore } from "@/lib/library-storage";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]";

const dangerClass = `inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full px-5 text-sm font-black disabled:cursor-wait disabled:opacity-70 ${focusRing}`;

const dangerStyle = {
  color: "var(--paper)",
  background: "var(--coral)",
  border: "1px solid var(--coral)",
} as const;

function browserStore(): KeyValueStore | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export default function DeleteAccount() {
  const library = useLibrary();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const pendingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const flag = new URLSearchParams(window.location.search).get("usuniecie");
    if (flag === "potwierdzenie") {
      setNotice("Wpisz dokładnie USUŃ, żeby potwierdzić usunięcie.");
      setOpen(true);
    } else if (flag === "blad") {
      setNotice("Nie udało się usunąć konta. Spróbuj ponownie albo napisz na parska.pl@gmail.com.");
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  if (!library.ready || !library.signedIn) return null;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (pendingRef.current) {
      event.preventDefault();
      return;
    }
    const typed = inputRef.current?.value ?? "";
    if (typed.trim() !== DELETE_ACCOUNT_PHRASE) {
      event.preventDefault();
      setNotice("Wpisz dokładnie USUŃ, żeby potwierdzić usunięcie.");
      inputRef.current?.focus();
      return;
    }
    pendingRef.current = true;
    setPending(true);
    const store = browserStore();
    if (store) clearAccountLibrary(store);
    event.preventDefault();
    const form = event.currentTarget;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        form.submit();
      });
    });
  };

  return (
    <section
      className="mt-16 rounded-[18px] px-4 py-5 sm:px-5"
      aria-labelledby="usun-konto"
      style={{ background: "var(--ink-2)", border: "1px solid var(--line)" }}
    >
      <h2 id="usun-konto" className="m-0 font-black" style={{ fontSize: "18px", letterSpacing: "-.01em" }}>
        Usunięcie konta
      </h2>
      <p className="mb-0 mt-2 max-w-xl text-sm leading-relaxed" style={{ color: "var(--paper-dim)" }}>
        Usunięcie jest trwałe. Znika konto logowania oraz dane powiązane z nim w bazie: profil, ulubione, lista do obejrzenia, przypomnienia i powiadomienia push.
      </p>
      {notice ? (
        <p role="alert" className="mb-0 mt-3 text-sm font-semibold" style={{ color: "var(--coral-hi)" }}>
          {notice}
        </p>
      ) : null}
      {!open ? (
        <button
          type="button"
          className={`${dangerClass} mt-4`}
          style={dangerStyle}
          onClick={() => {
            setNotice(null);
            setOpen(true);
          }}
        >
          Usuń konto
        </button>
      ) : (
        <form action="/auth/usun-konto" method="post" className="mt-4" onSubmit={onSubmit}>
          <label htmlFor="delete-account-confirmation" className="block text-sm font-bold" style={{ color: "var(--paper)" }}>
            Wpisz USUŃ, żeby potwierdzić
          </label>
          <input
            ref={inputRef}
            id="delete-account-confirmation"
            name="confirmation"
            type="text"
            required
            pattern={DELETE_ACCOUNT_PHRASE}
            maxLength={8}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            title="Wpisz dokładnie USUŃ"
            className={`mt-2 w-full max-w-xs rounded-xl px-3 py-3 text-base font-black ${focusRing}`}
            style={{ color: "var(--paper)", background: "var(--ink)", border: "1px solid var(--line-2)" }}
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="submit" className={dangerClass} style={dangerStyle} disabled={pending} aria-busy={pending}>
              {pending ? "Usuwam…" : "Usuń konto"}
            </button>
            <button
              type="button"
              className={`inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-black ${focusRing}`}
              style={{ color: "var(--paper)", background: "transparent", border: "1px solid var(--line-2)" }}
              onClick={() => {
                setOpen(false);
                setNotice(null);
              }}
            >
              Anuluj
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
