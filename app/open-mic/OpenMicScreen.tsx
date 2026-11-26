import type { ReactNode } from "react";
import Link from "next/link";
import OpenMicCard from "./OpenMicCard";
import OpenMicDates from "./OpenMicDates";
import OpenMicFilters from "./OpenMicFilters";
import { focusRing } from "./ui";
import HomeCityRedirect from "@/app/components/HomeCityRedirect";
import { OPEN_MIC_CITIES } from "@/lib/open-mic-cities";
import {
  cyklLabel,
  hasActiveOpenMicFilters,
  nextOpenMicDate,
  type OpenMicFilters as OpenMicFilterState,
  type OpenMicView,
} from "@/lib/open-mics";

const addClass =
  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--coral)] px-5 py-2.5 text-sm font-black text-[var(--ink)] transition-colors hover:bg-[var(--coral-hi)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--paper)] sm:w-auto";

const leadClass = "m-0 max-w-2xl text-[15px] md:text-[17px]";

export type OpenMicCrumb = {
  name: string;
  href: string;
  current?: boolean;
};

export type OpenMicFaqItem = {
  question: string;
  answer: string;
};

function Notice({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      className="rounded-[18px] px-6 py-16 text-center"
      style={{ border: "1px dashed var(--line-2)", background: "var(--ink-2)" }}
    >
      <p className="mono mb-4 text-xs uppercase" style={{ color: "var(--coral)", letterSpacing: ".16em" }}>
        {eyebrow}
      </p>
      <h2 className="m-0 font-black" style={{ fontSize: "clamp(28px, 4vw, 40px)", letterSpacing: "-.03em" }}>
        {title}
        <span className="dot-accent">.</span>
      </h2>
      <div className="mx-auto mt-4 max-w-md text-[16px] leading-relaxed" style={{ color: "var(--paper-dim)" }}>
        {children}
      </div>
    </div>
  );
}

export default function OpenMicScreen({
  h1,
  intro,
  showCityLinks = false,
  breadcrumbs,
  faqs,
  faqNote,
  showHomeCityRedirect = false,
  filters,
  explicitAllCities = false,
  catalogOk,
  view,
  now,
}: {
  h1: string;
  intro: readonly string[];
  showCityLinks?: boolean;
  breadcrumbs?: readonly OpenMicCrumb[];
  faqs: readonly OpenMicFaqItem[];
  faqNote?: string;
  showHomeCityRedirect?: boolean;
  filters: OpenMicFilterState;
  explicitAllCities?: boolean;
  catalogOk: boolean;
  view: OpenMicView;
  now: Date;
}) {
  const filtered = hasActiveOpenMicFilters(filters);
  const countLabel = !catalogOk
    ? "błąd wczytywania"
    : view.catalogCount === 0
      ? "na razie pusto"
      : filtered
        ? `${view.cycles.length} z ${view.catalogCount}`
        : `${view.catalogCount} ${cyklLabel(view.catalogCount)}`;

  return (
    <div className="band">
      <div className="mx-auto max-w-6xl">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav
            aria-label="Okruszki"
            className="mono mb-5 text-xs uppercase"
            style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}
          >
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.href}>
                {index > 0 ? <span aria-hidden="true">{" / "}</span> : null}
                {crumb.current ? (
                  <span aria-current="page" style={{ color: "var(--paper-dim)" }}>
                    {crumb.name}
                  </span>
                ) : (
                  <Link href={crumb.href} className={`hover:text-white ${focusRing}`}>
                    {crumb.name}
                  </Link>
                )}
              </span>
            ))}
          </nav>
        ) : null}

        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-baseline gap-4">
              <h1
                className="m-0 font-black leading-none"
                style={{ fontSize: "clamp(32px, 4vw, 44px)", letterSpacing: "-.025em" }}
              >
                {h1}
                <span className="dot-accent">.</span>
              </h1>
              <span className="mono text-xs uppercase" style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}>
                {countLabel}
              </span>
            </div>
            {intro.map((paragraph, index) => (
              <p
                key={paragraph}
                className={index === 0 ? leadClass : `${leadClass} mt-4`}
                style={{ color: "var(--paper-dim)" }}
              >
                {paragraph}
              </p>
            ))}
            {showCityLinks ? (
              <p className={`${leadClass} mt-4`} style={{ color: "var(--paper-dim)" }}>
                {"Open miki w miastach: "}
                {OPEN_MIC_CITIES.map((city, index) => (
                  <span key={city.slug}>
                    {index > 0 ? ", " : null}
                    <a href={`/open-mic/${city.slug}`} className="underline underline-offset-4">
                      {city.name}
                    </a>
                  </span>
                ))}
                .
              </p>
            ) : null}
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <Link href="/open-mic/dodaj" className={addClass}>
              Dodaj swój open mic
            </Link>
            <Link
              href="/zglos?rodzaj=open-mic"
              className="inline-flex min-h-11 items-center justify-center text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]"
              style={{ color: "var(--paper-dim)" }}
            >
              Zgłoś brakujący open mic
            </Link>
          </div>
        </header>

        {catalogOk && view.catalogCount > 0 && (
          <>
            {showHomeCityRedirect ? <HomeCityRedirect pathname="/open-mic" cities={view.cities} /> : null}
            <OpenMicFilters filters={filters} cities={view.cities} explicitAllCities={explicitAllCities} />
          </>
        )}

        {!catalogOk ? (
          <Notice eyebrow="open mic" title="Coś poszło nie tak">
            Nie udało się wczytać open miców. Odśwież stronę za chwilę.
          </Notice>
        ) : view.catalogCount === 0 ? (
          <Notice eyebrow="open mic" title="Brak open miców">
            <p className="m-0">
              Nie ma jeszcze ogłoszonych cykli. Gdy pojawią się open miki, zobaczysz tu miasto, scenę, zapisy i najbliższe terminy.
            </p>
          </Notice>
        ) : view.cycles.length === 0 ? (
          <Notice eyebrow="filtry" title="Brak wyników">
            <p className="m-0">Żaden open mic nie pasuje do tych filtrów.</p>
            <Link href="/open-mic?miasto=" className="mt-6 inline-flex min-h-11 items-center font-black" style={{ color: "var(--coral)" }}>
              Wyczyść filtry
            </Link>
          </Notice>
        ) : (
          <div className="flex flex-col gap-3">
            {view.cycles.map((cycle) => (
              <OpenMicCard key={cycle.id} cycle={cycle} next={nextOpenMicDate(cycle, view.dates)} now={now} />
            ))}
          </div>
        )}

        {catalogOk && view.cycles.length > 0 && (
          <OpenMicDates dates={view.dates} cycles={view.cycles} now={now} filtered={filtered} />
        )}

        {faqs.length > 0 ? (
          <section className="mt-12 max-w-2xl" aria-label="Pytania">
            <dl className="m-0">
              {faqs.map((item) => (
                <div key={item.question} className="mt-4 first:mt-0">
                  <dt className="m-0 text-[15px] font-black md:text-[17px]" style={{ color: "var(--paper)" }}>
                    {item.question}
                  </dt>
                  <dd className="m-0 mt-1 text-[15px] md:text-[17px]" style={{ color: "var(--paper-dim)" }}>
                    {item.answer}
                  </dd>
                </div>
              ))}
            </dl>
            {faqNote ? (
              <p className="m-0 mt-4 text-[15px] md:text-[17px]" style={{ color: "var(--paper-dim)" }}>
                {faqNote}
              </p>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}
