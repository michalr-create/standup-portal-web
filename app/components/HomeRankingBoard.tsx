"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import RankingCards from "./RankingCards";
import SectionHead from "./SectionHead";
import { RankingPeople, RankingShows } from "@/app/rankingi/RankingLists";
import type { HomeRankingBoard as Board } from "@/lib/rankings-data";
import {
  HOME_RANKING_CHIP_LABELS,
  RANKING_IDS,
  homeRankingSeeAllHref,
  type RankingId,
} from "@/lib/rankings";

const chipClass = [
  "chip inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-bold whitespace-nowrap",
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]",
].join(" ");

function revealChip(nav: HTMLElement, id: RankingId) {
  const current = nav.querySelector<HTMLElement>(`#home-ranking-tab-${id}`);
  if (!current) return;
  const navBox = nav.getBoundingClientRect();
  const chipBox = current.getBoundingClientRect();
  if (chipBox.left >= navBox.left - 1 && chipBox.right <= navBox.right + 1) return;
  const delta = chipBox.left - navBox.left - (navBox.width - chipBox.width) / 2;
  nav.scrollLeft += delta;
}

function EmptyLine({ children }: { children: string }) {
  return (
    <p className="py-8 text-center" style={{ color: "var(--paper-mute)" }}>
      {children}
    </p>
  );
}

function BoardBody({ board }: { board: Board }) {
  if (board.kind === "people") {
    if (board.people.length === 0) return <EmptyLine>{"Brak os\u00f3b w tym zestawieniu."}</EmptyLine>;
    return <RankingPeople people={board.people} />;
  }
  if (board.kind === "shows") {
    if (board.shows.length === 0) return <EmptyLine>{"Brak format\u00f3w w tym zestawieniu."}</EmptyLine>;
    return <RankingShows shows={board.shows} />;
  }
  if (board.pending) return <EmptyLine>{"Ranking ruszy jutro."}</EmptyLine>;
  if (board.entries.length === 0) return <EmptyLine>{"Brak pozycji w tym zestawieniu."}</EmptyLine>;
  return <RankingCards entries={board.entries} layout="strip" />;
}

export default function HomeRankingBoard({
  boards,
  initialId,
}: {
  boards: Board[];
  initialId: RankingId;
}) {
  const [selected, setSelected] = useState<RankingId>(initialId);
  const navRef = useRef<HTMLDivElement>(null);
  const board = boards.find((item) => item.id === selected) ?? boards[0];

  useEffect(() => {
    const nav = navRef.current;
    if (nav) revealChip(nav, selected);
  }, [selected]);

  const choose = (id: RankingId) => {
    setSelected(id);
    document.getElementById(`home-ranking-tab-${id}`)?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = RANKING_IDS.indexOf(selected);
    if (index < 0) return;
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % RANKING_IDS.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + RANKING_IDS.length) % RANKING_IDS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = RANKING_IDS.length - 1;
    else return;
    event.preventDefault();
    const id = RANKING_IDS[next];
    if (id) choose(id);
  };

  return (
    <>
      <SectionHead
        title="Rankingi"
        linkHref={homeRankingSeeAllHref(selected)}
        linkText={"Zobacz wszystkie \u2192"}
      />
      <div
        ref={navRef}
        role="tablist"
        aria-label="Zestawienia"
        onKeyDown={onKeyDown}
        className="mb-5 flex max-w-full items-center gap-2 overflow-x-auto pb-1 scrollbar-hide"
      >
        {RANKING_IDS.map((id) => {
          const active = id === selected;
          return (
            <button
              key={id}
              id={`home-ranking-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls="home-ranking-panel"
              tabIndex={active ? 0 : -1}
              className={`${chipClass}${active ? " active" : ""}`}
              onClick={() => setSelected(id)}
            >
              {HOME_RANKING_CHIP_LABELS[id]}
            </button>
          );
        })}
      </div>
      <div id="home-ranking-panel" role="tabpanel" aria-labelledby={`home-ranking-tab-${selected}`}>
        {board ? <BoardBody board={board} /> : <EmptyLine>{"Brak pozycji w tym zestawieniu."}</EmptyLine>}
      </div>
    </>
  );
}
