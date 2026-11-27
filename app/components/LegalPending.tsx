export default function LegalPending({ title }: { title: string }) {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="m-0 font-black leading-none" style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-.03em" }}>
        {title}
        <span className="dot-accent">.</span>
      </h1>
      <p className="mt-4 mb-0 text-base leading-relaxed" style={{ color: "var(--paper-dim)" }}>
        Dokument w przygotowaniu. Opublikujemy go po uzupełnieniu danych administratora i przeglądzie prawnym.
      </p>
    </article>
  );
}
