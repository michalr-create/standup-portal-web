"use client";

import { useState } from "react";
import Link from "next/link";
import HeartButton from "@/app/components/HeartButton";
import PendingLink from "@/app/components/PendingLink";
import ThumbDuration from "@/app/components/ThumbDuration";
import { DEFAULT_GRID_CLASS } from "@/app/components/itemsBrowserLayout";
import SizedImage from "@/app/components/SizedImage";
import { IMAGE_SIZE } from "@/lib/image-alt";
import type { RankingPersonCard } from "@/lib/rankings-data";
import type { ShowRank, SpecialProgram } from "@/lib/rankings";
import { formatViews, odcinekLabel } from "@/lib/view-count";

function RankingPrograms({ programs }: { programs: SpecialProgram[] }) {
  const [open, setOpen] = useState(false);
  const [partKey, setPartKey] = useState<string | null>(null);
  return (
    <div className="mt-2 border-t pt-2" style={{ borderColor: "var(--line)" }}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="mono text-[12px] font-bold uppercase"
        style={{ color: "var(--paper-dim)", letterSpacing: ".08em" }}
      >
        {open ? "Ukryj programy" : "Poka\u017c programy"}
      </button>
      {open && (
        <ol className="mt-2 flex list-none flex-col gap-1 p-0">
          {programs.map((program) => {
            const multi = program.parts.length > 1;
            const partsOpen = partKey === program.key;
            return (
              <li key={program.key}>
                {multi ? (
                  <button
                    type="button"
                    aria-expanded={partsOpen}
                    onClick={() => setPartKey(partsOpen ? null : program.key)}
                    className="text-left text-sm font-bold"
                  >
                    {program.name}
                    <span className="mono ml-2 font-medium" style={{ color: "var(--paper-dim)" }}>
                      {program.parts.length} {"cz\u0119\u015bci"}
                    </span>
                  </button>
                ) : (
                  <ProgramPartLink part={program.parts[0]} label={program.name} />
                )}
                {multi && partsOpen && (
                  <ol className="mb-1 mt-1 flex list-none flex-col gap-1 p-0 pl-4">
                    {program.parts.map((part) => (
                      <li key={part.id}>
                        <ProgramPartLink
                          part={part}
                          label={`${part.partNumber ?? ""}${part.partNumber != null ? ". " : ""}${part.title}`}
                        />
                      </li>
                    ))}
                  </ol>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function personPhoto(url: string | null): string | null {
  const trimmed = url?.trim() ?? "";
  return trimmed || null;
}

function ProgramPartLink({
  part,
  label,
}: {
  part: SpecialProgram["parts"][number] | undefined;
  label: string;
}) {
  if (!part) return null;
  if (!part.url) {
    return <span className="text-sm" style={{ color: "var(--paper-dim)" }}>{label}</span>;
  }
  return (
    <a href={part.url} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline">
      {label}
    </a>
  );
}

export function RankingPeople({ people }: { people: RankingPersonCard[] }) {
  if (people.length === 0) return null;
  return (
    <ol className="list-none p-0 m-0 flex flex-col gap-3">
      {people.map((person) => {
        const photo = personPhoto(person.photoUrl);
        return (
        <li key={person.id}>
          <div
            className="rounded-2xl px-3 py-3 sm:px-4 transition-[background,border-color,box-shadow] duration-150 has-[[data-link-pending=true]]:border-[var(--coral)] has-[[data-link-pending=true]]:bg-[var(--ink-3)] has-[[data-link-pending=true]]:shadow-[inset_0_0_0_1px_var(--coral)]"
            style={{ background: "var(--ink-2)", border: "1px solid var(--line)" }}
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <PendingLink
                href={"/standuper/" + person.slug}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-xl active:bg-[var(--ink-4)]"
              >
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full font-black"
                  style={{ background: "var(--coral)", color: "var(--ink)", fontSize: "14px" }}
                >
                  <span className="sr-only">{"Miejsce "}</span>
                  {person.rank}
                </span>
                {photo && (
                  <span
                    className="grid h-10 w-10 sm:h-12 sm:w-12 shrink-0 overflow-hidden rounded-full"
                    style={{ background: "var(--ink-3)" }}
                  >
                    <SizedImage
                      src={photo}
                      alt={person.name.trim() || "Standuper"}
                      width={IMAGE_SIZE.avatar.width}
                      height={IMAGE_SIZE.avatar.height}
                      className="h-full w-full object-cover"
                    />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-extrabold" style={{ letterSpacing: "-.01em" }}>
                    {person.name}
                  </span>
                  <span className="mono mt-0.5 block text-[13px]" style={{ color: "var(--paper-dim)" }}>
                    {person.metricLabel}
                  </span>
                </span>
              </PendingLink>
              <span className="shrink-0">
                <HeartButton type="person" slug={person.slug} name={person.name} size={16} />
              </span>
            </div>
            {person.programs && person.programs.length > 0 && (
              <RankingPrograms programs={person.programs} />
            )}
          </div>
        </li>
        );
      })}
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
                <SizedImage
                  src={show.thumbnailUrl}
                  alt={show.name}
                  width={IMAGE_SIZE.thumbLandscape.width}
                  height={IMAGE_SIZE.thumbLandscape.height}
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
