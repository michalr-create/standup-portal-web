"use client";

import type { CSSProperties, ReactNode } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { OPEN_MIC_LANGUAGES, languageLabel, type OpenMicSubmitState } from "@/lib/open-mics";
import { submitOpenMic } from "./actions";

const initial: OpenMicSubmitState = { status: "idle" };

const inputStyle: CSSProperties = {
  color: "var(--paper)",
  border: "1px solid rgba(239, 232, 220, .42)",
  background: "rgba(239, 232, 220, .10)",
  colorScheme: "dark",
};

const labelStyle: CSSProperties = { color: "var(--paper-mute)", letterSpacing: ".14em" };

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="mono text-xs uppercase" style={labelStyle}>
        {label}
      </span>
      {children}
      {hint && (
        <span className="text-sm leading-snug" style={{ color: "var(--paper-dim)" }}>
          {hint}
        </span>
      )}
    </label>
  );
}

const fieldClass = "min-h-11 w-full rounded-[10px] px-3 text-base font-semibold";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[var(--coral)] px-5 text-sm font-black text-[var(--ink)] transition-colors hover:bg-[var(--coral-hi)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--paper)] disabled:opacity-60 sm:w-auto"
    >
      {pending ? "Wysyłanie…" : "Wyślij zgłoszenie"}
    </button>
  );
}

export default function OpenMicSubmitForm() {
  const [state, action] = useFormState(submitOpenMic, initial);

  if (state.status === "success") {
    return (
      <div
        className="rounded-[18px] px-6 py-12 text-center"
        style={{ border: "1px solid var(--line)", background: "var(--ink-2)" }}
        role="status"
      >
        <p className="mono mb-4 text-xs uppercase" style={{ color: "var(--coral)", letterSpacing: ".16em" }}>
          zgłoszenie
        </p>
        <h2 className="m-0 font-black" style={{ fontSize: "clamp(28px, 4vw, 40px)", letterSpacing: "-.03em" }}>
          Dzięki, sprawdzimy i opublikujemy
          <span className="dot-accent">.</span>
        </h2>
        <Link
          href="/open-mic"
          className="mt-6 inline-flex min-h-11 items-center font-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]"
          style={{ color: "var(--coral)" }}
        >
          Wróć do open miców
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="relative flex flex-col gap-4">
      <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label>
          Zostaw puste
          <input type="text" name="hp_leave_blank" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      {state.status === "error" && (
        <p
          role="alert"
          className="m-0 rounded-[12px] px-4 py-3 text-sm font-bold"
          style={{ color: "var(--paper)", background: "rgba(232, 89, 74, .18)", border: "1px solid var(--coral)" }}
        >
          {state.error}
        </p>
      )}

      <Field label="Nazwa">
        <input name="name" required minLength={2} maxLength={120} className={fieldClass} style={inputStyle} />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Miasto">
          <input name="city" maxLength={80} className={fieldClass} style={inputStyle} />
        </Field>
        <Field label="Lokal">
          <input name="venue" maxLength={120} className={fieldClass} style={inputStyle} />
        </Field>
      </div>
      <Field label="Adres">
        <input name="address" maxLength={200} className={fieldClass} style={inputStyle} />
      </Field>
      <Field label="Jak często" hint="Np. co tydzień, wtorek.">
        <input name="recurrence" maxLength={300} className={fieldClass} style={inputStyle} />
      </Field>
      <Field label="Język">
        <select name="language" className={fieldClass} style={inputStyle} defaultValue="">
          <option value="">nie wiem</option>
          {OPEN_MIC_LANGUAGES.map((language) => (
            <option key={language} value={language}>
              {languageLabel(language)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Zapisy" hint="Gdzie komik się zgłasza: fanpage, e-mail, formularz.">
        <textarea name="signup_info" maxLength={500} rows={3} className={`${fieldClass} py-2`} style={inputStyle} />
      </Field>
      <Field label="Link do zapisów">
        <input name="signup_url" type="url" inputMode="url" maxLength={500} placeholder="https://" className={fieldClass} style={inputStyle} />
      </Field>
      <Field label="Zasady">
        <textarea name="rules" maxLength={1000} rows={3} className={`${fieldClass} py-2`} style={inputStyle} />
      </Field>
      <Field label="Cena dla widzów" hint="Np. bilet 20 zł albo wstęp wolny.">
        <input name="price" maxLength={120} className={fieldClass} style={inputStyle} />
      </Field>
      <Field label="Organizator">
        <input name="organizer" maxLength={160} className={fieldClass} style={inputStyle} />
      </Field>
      <Field label="E-mail do kontaktu" hint="Nie publikujemy go. Napiszemy tylko, gdy zgłoszenie będzie niejasne.">
        <input name="email" type="email" required maxLength={200} autoComplete="email" className={fieldClass} style={inputStyle} />
      </Field>
      <Field label="Link do źródła" hint="Strona, wydarzenie albo fanpage, z którego da się potwierdzić cykl.">
        <input name="source_url" type="url" inputMode="url" maxLength={500} placeholder="https://" className={fieldClass} style={inputStyle} />
      </Field>

      <SubmitButton />
    </form>
  );
}
