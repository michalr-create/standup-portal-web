import type { Metadata } from "next";
import LegalDocument from "@/app/components/LegalDocument";
import LegalPending from "@/app/components/LegalPending";
import { POLITYKA_BODY } from "@/lib/legal/polityka";
import { draftHasPlaceholder, legalPagesAreReady } from "@/lib/legal/publish";
import { noindexMetadata } from "@/lib/seo";

const TITLE = "Polityka prywatności";
const PATH = "/polityka-prywatnosci";
const ready = legalPagesAreReady() && !draftHasPlaceholder(POLITYKA_BODY);

export const metadata: Metadata = ready
  ? {
      title: TITLE,
      description: "Zasady przetwarzania danych osobowych w serwisie parska.pl.",
      alternates: { canonical: PATH },
    }
  : noindexMetadata(TITLE, PATH, "Dokument w przygotowaniu.");

export default function PolitykaPrywatnosciPage() {
  if (!ready) return <LegalPending title={TITLE} />;
  return <LegalDocument title={TITLE} source={POLITYKA_BODY} />;
}
