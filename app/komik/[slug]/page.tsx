import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function KomikRedirect({ params }: Props) {
  const { slug } = await params;
  redirect(`/standuper/${slug}`);
}
