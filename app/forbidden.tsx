import { signOut } from "@/app/auth/actions";
import Link from "next/link";

export default function Forbidden() {
  return (
    <main className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-start justify-center px-6 py-16">
      <p className="mono mb-3 text-xs uppercase" style={{ color: "var(--coral)", letterSpacing: ".16em" }}>
        403
      </p>
      <h1 className="m-0 text-3xl font-black" style={{ letterSpacing: "-.03em" }}>
        Brak dostępu<span className="dot-accent">.</span>
      </h1>
      <p className="mt-3 text-base leading-relaxed" style={{ color: "var(--paper-dim)" }}>
        To konto nie jest na liście administratorów.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center font-black"
          style={{ color: "var(--coral)" }}
        >
          Wróć na portal
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold"
            style={{ color: "var(--paper)", border: "1px solid var(--line-2)" }}
          >
            Wyloguj
          </button>
        </form>
      </div>
    </main>
  );
}
