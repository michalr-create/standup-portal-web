import HomeRankingBoard from "./HomeRankingBoard";
import { getHomeRankingBoards } from "@/lib/rankings-data";
import { selectHomeRanking } from "@/lib/rankings";

export default async function HomeRankings() {
  const boards = await getHomeRankingBoards();
  const hity = boards.find((board) => board.id === "hity");
  const hityVideos = hity?.kind === "videos" ? hity : null;
  const initialId = selectHomeRanking({
    pending: hityVideos == null || hityVideos.pending,
    entryCount: hityVideos?.entries.length ?? 0,
  });

  return (
    <section className="band">
      <div className="max-w-6xl mx-auto">
        <HomeRankingBoard boards={boards} initialId={initialId} />
      </div>
    </section>
  );
}
