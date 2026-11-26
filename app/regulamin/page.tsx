import type { Metadata } from "next";
import LegalDocument from "@/app/components/LegalDocument";
import LegalPending from "@/app/components/LegalPending";
import { REGULAMIN_BODY } from "@/lib/legal/regulamin";
import { draftHasPlaceholder, legalPagesAreReady } from "@/lib/legal/publish";
import { noindexMetadata } from "@/lib/seo";

const TITLE = "Regulamin";
const PATH = "/regulamin";
const ready = legalPagesAreReady() && !draftHasPlaceholder(REGULAMIN_BODY);

export const metadata: Metadata = ready
  ? {
      title: TITLE,
      description: "Regulamin świadczenia usług drogą elektroniczną w serwisie parska.pl.",
      alternates: { canonical: PATH },
    }
  : noindexMetadata(TITLE, PATH, "Dokument w przygotowaniu.");

export default function RegulaminPage() {
  if (!ready) return <LegalPending title={TITLE} />;
  return <LegalDocument title={TITLE} source={REGULAMIN_BODY} />;
}
