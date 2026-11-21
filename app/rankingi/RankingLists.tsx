import Link from "next/link";
import HeartButton from "@/app/components/HeartButton";
import ThumbDuration from "@/app/components/ThumbDuration";
import { DEFAULT_GRID_CLASS } from "@/app/components/itemsBrowserLayout";
import type { RankingPersonCard } from "@/lib/rankings-data";
import type { ShowRank } from "@/lib/rankings";
import { formatViews, odcinekLabel } from "@/lib/view-count";

export function RankingPeople({ people }: { people: RankingPersonCard[] }) {
  if (people.length === 0) return null;
  return (
    <ol className="list-none p-0 m-0 flex flex-col gap-3">
      {people.map((person) => (
        <li key={person.id}>
          <div
            className="flex items-center gap-3 sm:gap-4 rounded-2xl px-3 py-3 sm:px-4"
            style={{ background: "var(--ink-2)", border: "1px solid var(--line)" }}
          >
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full font-black"
              style={{ background: "var(--coral)", color: "var(--ink)", fontSize: "14px" }}
            >
              <span className="sr-only">{"Miejsce "}</span>
              {person.rank}
            </span>
            <Link href={"/standuper/" + person.slug} className="flex min-w-0 flex-1 items-center gap-3">
              <span
                className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full font-black"
                style={{ background: "var(--ink-3)", color: "var(--paper)" }}
              >
                {person.photoUrl ? (
                  <img src={person.photoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  person.name.slice(0, 1)
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-extrabold" style={{ letterSpacing: "-.01em" }}>
                  {person.name}
                </span>
                <span className="mono mt-0.5 block text-[13px]" style={{ color: "var(--paper-dim)" }}>
                  {person.metricLabel}
                </span>
              </span>
            </Link>
            <HeartButton type="person" slug={person.slug} name={person.name} size={16} />
          </div>
        </li>
      ))}
    </ol>
  );
}

export function RankingShows({ shows }: { shows: ShowRank[] }) {
  if (shows.length === 0) return null;
  return (
    <div className={DEFAULT_GRID_CLASS}>
      {shows.map((show) => (
        <article key={show.id} className="group vcard relative text-left w-full min-w-0">
          <Link
            href={"/format/" + show.slug}
            className="block text-left w-full rounded-[14px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]"
          >
            <div
              className="overflow-hidden relative"
              style={{
                aspectRatio: "16/10",
                borderRadius: "14px",
                border: "1px solid var(--line)",
                background: "var(--ink-3)",
              }}
            >
              {show.thumbnailUrl && (
                <img
                  src={show.thumbnailUrl}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              )}
              <ThumbDuration seconds={show.durationSeconds} isPaid={false} />
              <span
                className="absolute top-2.5 left-2.5 z-20 grid h-8 min-w-8 place-items-center rounded-full px-2 font-black"
                style={{ background: "var(--coral)", color: "var(--ink)", fontSize: "14px" }}
              >
                <span className="sr-only">{"Miejsce "}</span>
                {show.rank}
              </span>
              <div
                className="absolute top-2.5 left-12 flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold"
                style={{
                  background: "rgba(11,11,11,.75)",
                  backdropFilter: "blur(6px)",
                  color: "var(--paper)",
                  fontSize: "11px",
                }}
              >
                <span className="inline-block w-2 h-2 rounded-sm" style={{ background: "var(--coral)" }} />
                Format
              </div>
            </div>
            <div className="pt-3 px-0.5">
              <h4 className="font-extrabold leading-tight line-clamp-2" style={{ fontSize: "16px", letterSpacing: "-.01em" }}>
                {show.name}
              </h4>
            </div>
            <p className="mono mt-1.5 px-0.5 text-[13px]" style={{ color: "var(--paper-dim)" }}>
              <span style={{ color: "var(--paper)" }}>{formatViews(show.viewCount)}</span>
              <span style={{ color: "var(--paper-meta)" }}>{" \u00b7 "}</span>
              {show.episodeCount} {odcinekLabel(show.episodeCount)}
            </p>
          </Link>
          <div className="absolute top-1 right-1 z-20">
            <HeartButton type="show" slug={show.slug} name={show.name} size={15} overlay />
          </div>
        </article>
      ))}
    </div>
  );
}
