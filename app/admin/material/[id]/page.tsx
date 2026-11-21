import { notFound } from "next/navigation";
import { getMaterialEditor } from "../actions";
import MaterialEditor from "../MaterialEditor";

export const dynamic = "force-dynamic";

export default async function MaterialEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id)) notFound();
  const itemId = Number(id);
  if (!Number.isSafeInteger(itemId)) notFound();
  const data = await getMaterialEditor(itemId);
  if (!data) notFound();
  return <MaterialEditor data={data} />;
}
