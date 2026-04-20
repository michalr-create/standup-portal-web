import { getContentTagsWithCounts } from "../actions-sources";
import TagsManager from "./TagsManager";

export const dynamic = "force-dynamic";

export default async function TagiPage() {
  const tags = await getContentTagsWithCounts();

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">Tagi</h1>
      <TagsManager tags={tags} />
    </div>
  );
}
