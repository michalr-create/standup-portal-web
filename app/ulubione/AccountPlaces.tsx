"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listCities, loadMyReminders, readHomeCity, saveHomeCity, setReminder, type ReminderRow } from "@/app/konto/place-actions";
import CityCombobox from "@/app/components/CityCombobox";
import { formatEventWhen } from "@/lib/events";
import { getBrowserSupabase } from "@/lib/supabase-browser";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]";

export default function AccountPlaces() {
  const [signedIn, setSignedIn] = useState(false);
  const [ready, setReady] = useState(false);
  const [cities, setCities] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [reminders, setReminders] = useState<ReminderRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    let cancelled = false;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user.id ?? null;
      setTimeout(() => {
        if (cancelled) return;
        setSignedIn(Boolean(userId));
        if (!userId) {
          setReady(true);
          return;
        }
        void Promise.all([readHomeCity(), listCities(), loadMyReminders()]).then(([home, names, saved]) => {
          if (cancelled) return;
          const options = home && !names.includes(home) ? [home, ...names] : names;
          setCity(home ?? "");
          setCities(options);
          setReminders(saved.ok ? saved.reminders : []);
          if (!saved.ok) setError(saved.error);
          setReady(true);
        });
      }, 0);
    });
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  const chooseCity = (next: string) => {
    const previous = city;
    setCity(next);
    setError(null);
    void saveHomeCity(next || null).then((result) => {
      if (result.ok) {
        setCity(result.city ?? "");
        return;
      }
      setCity(previous);
      setError(result.error);
    });
  };

  const removeReminder = (eventId: number) => {
    const previous = reminders;
    setReminders((current) => current.filter((row) => row.eventId !== eventId));
    setError(null);
    void setReminder(eventId, false).then((result) => {
      if (!result.ok) {
        setReminders(previous);
        setError(result.error);
      }
    });
  };

  return (
    <div className="mb-10 flex flex-col gap-8">
      <section aria-labelledby="moje-miasto">
        <h2 id="moje-miasto" className="font-black mb-2" style={{ fontSize: "18px", letterSpacing: "-.01em" }}>
          Moje miasto
          <span className="dot-accent">.</span>
        </h2>
        {!ready ? (
          <p className="m-0 text-sm" style={{ color: "var(--paper-mute)" }}>Ładowanie…</p>
        ) : signedIn ? (
          <div className="max-w-sm">
            <label htmlFor="moje-miasto-input" className="mono mb-1.5 block text-xs uppercase" style={{ color: "var(--paper-mute)", letterSpacing: ".14em" }}>
              Domyślne na trasach i open micach
            </label>
            <CityCombobox
              cities={cities}
              selectedCity={city}
              onSelect={chooseCity}
              inputId="moje-miasto-input"
              minHeightClass="min-h-11"
            />
            <p className="m-0 mt-2 text-sm" style={{ color: "var(--paper-dim)" }}>
              Wchodzisz na trasy albo open mic bez miasta w adresie — ustawiamy to. Wyczyszczenie filtra zostawia wszystkie miasta.
            </p>
          </div>
        ) : (
          <p className="m-0 text-sm" style={{ color: "var(--paper-dim)" }}>
            <Link href="/zaloguj?next=/ulubione" className={`font-bold ${focusRing}`} style={{ color: "var(--coral)" }}>
              Zaloguj się
            </Link>
            , żeby zapamiętać swoje miasto.
          </p>
        )}
      </section>

      <section aria-labelledby="moje-przypomnienia">
        <h2 id="moje-przypomnienia" className="font-black mb-2" style={{ fontSize: "18px", letterSpacing: "-.01em" }}>
          Moje przypomnienia
          <span className="dot-accent">.</span>
        </h2>
        {!ready ? (
          <p className="m-0 text-sm" style={{ color: "var(--paper-mute)" }}>Ładowanie…</p>
        ) : !signedIn ? (
          <p className="m-0 text-sm" style={{ color: "var(--paper-dim)" }}>
            Przy terminie na trasach jest „Przypomnij mi”.{" "}
            <Link href="/zaloguj?next=/ulubione" className={`font-bold ${focusRing}`} style={{ color: "var(--coral)" }}>
              Zaloguj się
            </Link>
            , żeby zebrać je tutaj. Push włączysz niżej, w powiadomieniach.
          </p>
        ) : reminders.length === 0 ? (
          <p className="m-0 text-sm" style={{ color: "var(--paper-mute)" }}>
            Nie masz zapisanych występów.{" "}
            <Link href="/trasy" className={`font-bold ${focusRing}`} style={{ color: "var(--coral)" }}>
              Zobacz trasy
            </Link>
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {reminders.map((row) => {
              const label = row.title.trim() || [row.city, row.venue].filter(Boolean).join(" · ");
              return (
                <li
                  key={row.eventId}
                  className="flex flex-col gap-3 rounded-[18px] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  style={{ border: "1px solid var(--line)", background: "var(--ink-2)" }}
                >
                  <div className="min-w-0">
                    <p className="mono m-0 text-xs uppercase" style={{ color: "var(--paper-meta)", letterSpacing: ".06em" }}>
                      <time dateTime={row.startsAt}>{formatEventWhen(row.startsAt)}</time>
                    </p>
                    <p className="m-0 mt-1 font-black" style={{ fontSize: "18px" }}>{label}</p>
                    <p className="m-0 mt-1 text-sm" style={{ color: "var(--paper-dim)" }}>
                      {[row.city, row.venue].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`/api/wydarzenia/${row.eventId}/kalendarz`}
                      className={`inline-flex min-h-11 items-center rounded-full px-3 text-sm font-black ${focusRing}`}
                      style={{ color: "var(--paper)", border: "1px solid var(--line-2)" }}
                    >
                      Kalendarz
                    </a>
                    <button
                      type="button"
                      className={`inline-flex min-h-11 items-center rounded-full px-3 text-sm font-black ${focusRing}`}
                      style={{ color: "var(--coral)", background: "transparent", border: "1px solid var(--coral)" }}
                      onClick={() => removeReminder(row.eventId)}
                    >
                      Usuń
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {error && (
        <p role="alert" className="m-0 text-sm font-semibold" style={{ color: "var(--coral)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
