import type { Metadata } from "next";
import { noindexMetadata } from "@/lib/seo";

export const metadata: Metadata = noindexMetadata(
  "Ulubione",
  "/ulubione",
  "Obserwowane osoby, formaty i nagrania.",
);

export default function UlubioneLayout({ children }: { children: React.ReactNode }) {
  return children;
}
