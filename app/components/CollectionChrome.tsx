import type { ReactNode } from "react";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]";

export type CollectionCrumb = {
  label: string;
  href?: string;
};

export type CollectionFaq = {
  question: string;
  answer: ReactNode;
};

/**
 * Header, intro and FAQ shared by the new collection pages.
 * Crumbs match the Okruszki trail used on specials and cities.
 */
export default function CollectionChrome({
  crumbs,
  h1,
  intro,
  faqs,
  children,
}: {
  crumbs: readonly CollectionCrumb[];
  h1: string;
  intro: ReactNode;
  faqs: readonly CollectionFaq[];
  children: ReactNode;
}) {
  return (
    <div className="band">
      <div className="max-w-6xl mx-auto">
        <nav
          aria-label="Okruszki"
          className="mono mb-5 text-xs uppercase"
          style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}
        >
          {crumbs.map((crumb, index) => (
            <span key={`${crumb.label}-${index}`}>
              {index > 0 ? <span aria-hidden="true">{" / "}</span> : null}
              {crumb.href ? (
                <a href={crumb.href} className={`hover:text-white ${focusRing}`}>
                  {crumb.label}
                </a>
              ) : (
                <span aria-current="page" style={{ color: "var(--paper-dim)" }}>
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </nav>

        <header className="mb-8">
          <h1
            className="font-black m-0 leading-none"
            style={{ fontSize: "clamp(32px, 4vw, 44px)", letterSpacing: "-.025em" }}
          >
            {h1}
            <span className="dot-accent">.</span>
          </h1>
          <div className="mt-4 max-w-2xl" style={{ color: "var(--paper-dim)", fontSize: "17px" }}>
            {intro}
          </div>
        </header>

        {children}

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
          </section>
        ) : null}
      </div>
    </div>
  );
}
