import HeartButton from "./HeartButton";
import WatchLaterButton from "./WatchLaterButton";
import { OPEN_YOUTUBE_LABEL } from "@/lib/player-session";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]";

export default function SpecialPageActions({
  itemId,
  title,
  videoId,
  people,
}: {
  itemId: number;
  title: string;
  videoId: string | null;
  people: { name: string; slug: string }[];
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
      <WatchLaterButton itemId={itemId} title={title} />
      {people.map((person) => (
        <HeartButton key={person.slug} type="person" slug={person.slug} name={person.name} size={22} />
      ))}
      {videoId ? (
        <a
          href={`https://www.youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex min-h-11 items-center gap-1 text-sm font-bold underline-offset-4 hover:underline ${focusRing}`}
          style={{ color: "var(--paper-dim)" }}
        >
          {OPEN_YOUTUBE_LABEL}
          <span aria-hidden="true">↗</span>
        </a>
      ) : null}
    </div>
  );
}
