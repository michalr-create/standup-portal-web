import { permanentRedirect } from "next/navigation";
import { getPersonBySlug } from "@/lib/data";
import { personAliasTarget } from "@/lib/slug-alias-lookup";
import { slugRedirectPath } from "@/lib/slug-redirect";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function KomikRedirect({ params }: Props) {
  const { slug } = await params;
  const person = await getPersonBySlug(slug);
  if (person?.slug) permanentRedirect(`/standuper/${person.slug}`);
  const path = slugRedirectPath("standuper", slug, await personAliasTarget(slug));
  permanentRedirect(path ?? `/standuper/${slug}`);
}
