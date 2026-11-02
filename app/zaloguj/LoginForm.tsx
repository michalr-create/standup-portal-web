"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { authCallbackUrl } from "@/lib/safe-next";
import {
  CALLBACK_ERROR_MESSAGE,
  LINK_SENT_MESSAGE,
  loginErrorMessage,
} from "@/lib/auth-messages";

type Status = "idle" | "submitting" | "sent" | "error";

const inputClass =
  "min-h-11 w-full rounded-[10px] px-3 text-base font-semibold outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)] disabled:opacity-60";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const callbackError = searchParams.get("error") === "auth";
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const callbackUrl = () => authCallbackUrl(window.location.origin, next);

  const handleEmail = async (event: FormEvent) => {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");

    const supabase = getBrowserSupabase();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callbackUrl() },
    });

    if (error) {
      setStatus("error");
      setMessage(loginErrorMessage(error.message));
      return;
    }

    setStatus("sent");
    setMessage(LINK_SENT_MESSAGE);
  };

  const handleGoogle = async () => {
    setStatus("submitting");
    setMessage("");

    const supabase = getBrowserSupabase();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });

    if (error) {
      setStatus("error");
      setMessage(loginErrorMessage(error.message));
    }
  };

  return (
    <div
      className="w-full max-w-md rounded-[18px] px-6 py-8 sm:px-8"
      style={{ background: "var(--ink-2)", border: "1px solid var(--line)" }}
    >
      <p className="mono mb-3 text-xs uppercase" style={{ color: "var(--coral)", letterSpacing: ".16em" }}>
        konto
      </p>
      <h1 className="m-0 text-3xl font-black" style={{ letterSpacing: "-.03em" }}>
        Zaloguj się<span className="dot-accent">.</span>
      </h1>
      <p className="mt-2 mb-6 text-sm leading-relaxed" style={{ color: "var(--paper-dim)" }}>
        Link na e-mail albo konto Google. Bez hasła.
      </p>

      {status === "sent" ? (
        <p
          role="status"
          className="rounded-[10px] px-3 py-3 text-sm font-semibold leading-relaxed"
          style={{ background: "var(--ink-3)", color: "var(--paper)" }}
        >
          {message}
        </p>
      ) : (
        <form onSubmit={handleEmail} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5" htmlFor="email">
            <span className="mono text-xs uppercase" style={{ color: "var(--paper-mute)", letterSpacing: ".14em" }}>
              E-mail
            </span>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="twoj@email.pl"
              disabled={status === "submitting"}
              className={inputClass}
              style={{
                color: "var(--paper)",
                border: "1px solid rgba(239, 232, 220, .42)",
                background: "rgba(239, 232, 220, .10)",
                colorScheme: "dark",
              }}
            />
          </label>

          <button
            type="submit"
            disabled={status === "submitting" || email.trim().length === 0}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[var(--coral)] px-5 text-sm font-black text-[var(--ink)] transition-colors hover:bg-[var(--coral-hi)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--paper)] disabled:opacity-60"
          >
            {status === "submitting" ? "Wysyłanie…" : "Wyślij link do logowania"}
          </button>
        </form>
      )}

      <div className="my-5 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1" style={{ background: "var(--line)" }} />
        <span className="mono text-xs uppercase" style={{ color: "var(--paper-mute)" }}>
          albo
        </span>
        <span className="h-px flex-1" style={{ background: "var(--line)" }} />
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={status === "submitting"}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-full px-5 text-sm font-black transition-colors hover:bg-[var(--ink-3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)] disabled:opacity-60"
        style={{ color: "var(--paper)", border: "1px solid var(--line-2)" }}
      >
        Zaloguj przez Google
      </button>

      {(status === "error" || callbackError) && status !== "sent" && (
        <p
          role="alert"
          className="mt-4 rounded-[10px] px-3 py-3 text-sm font-semibold leading-relaxed"
          style={{ background: "rgba(232, 89, 74, .12)", color: "var(--coral-hi)" }}
        >
          {status === "error" ? message : CALLBACK_ERROR_MESSAGE}
        </p>
      )}

      <p className="mt-6 mb-0 text-xs leading-relaxed" style={{ color: "var(--paper-mute)" }}>
        Rejestracja nowych kont jest na razie wyłączona. Link zadziała, jeśli ten adres ma już konto.
      </p>
    </div>
  );
}
