import type { Metadata } from "next";
import LegalDocument from "@/app/components/LegalDocument";
import LegalPending from "@/app/components/LegalPending";
import { COOKIES_BODY } from "@/lib/legal/cookies";
import { draftHasPlaceholder, legalPagesAreReady } from "@/lib/legal/publish";
import { noindexMetadata } from "@/lib/seo";

const TITLE = "Cookies";
const PATH = "/cookies";
const ready = legalPagesAreReady() && !draftHasPlaceholder(COOKIES_BODY);

export const metadata: Metadata = ready
  ? {
      title: TITLE,
      description: "Zasady plików cookies i podobnych technologii w serwisie parska.pl.",
      alternates: { canonical: PATH },
    }
  : noindexMetadata(TITLE, PATH, "Dokument w przygotowaniu.");

export default function CookiesPage() {
  if (!ready) return <LegalPending title={TITLE} />;
  return <LegalDocument title={TITLE} source={COOKIES_BODY} />;
}
