import { Suspense } from "react";
import type { Metadata } from "next";
import LoginForm from "./LoginForm";
import { noindexMetadata } from "@/lib/seo";

export const metadata: Metadata = noindexMetadata(
  "Zaloguj si\u0119",
  "/zaloguj",
  "Zaloguj si\u0119 do parska.pl linkiem e-mail albo kontem Google.",
);

function LoginFallback() {
  return (
    <div
      className="w-full max-w-md rounded-[18px] px-6 py-16 text-center text-sm font-semibold"
      style={{ background: "var(--ink-2)", border: "1px solid var(--line)", color: "var(--paper-dim)" }}
    >
      Ładowanie…
    </div>
  );
}

export default function ZalogujPage() {
  return (
    <div className="flex justify-center px-4 py-12 sm:py-16">
      <Suspense fallback={<LoginFallback />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
