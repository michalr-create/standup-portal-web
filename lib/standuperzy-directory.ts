/** Alphabetical directory order. Polish collation via `localeCompare(..., "pl")`. */
export function sortPeopleByName<T extends { name: string; id?: number }>(people: readonly T[]): T[] {
  return [...people].sort((a, b) => {
    const byName = a.name.localeCompare(b.name, "pl");
    if (byName !== 0) return byName;
    if (typeof a.id === "number" && typeof b.id === "number" && a.id !== b.id) return a.id - b.id;
    return 0;
  });
}

/** 1 pozycja, 2 pozycje, 5 pozycji, 22 pozycje, 701 pozycja. */
export function pozycjaCountLabel(n: number): string {
  const abs = Math.abs(Math.trunc(n));
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return "pozycja";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 > 20)) return "pozycje";
  return "pozycji";
}

/** Liczba pozycji albo null, gdy nie ma czego pokazać (0 i mniej). */
export function formatItemCount(count: number): string | null {
  if (count <= 0) return null;
  return count + " " + pozycjaCountLabel(count);
}

export function peopleByActivity<T extends { id: number; name: string }>(
  people: readonly T[],
  counts: ReadonlyMap<number, number>,
  limit: number,
): T[] {
  return [...people]
    .sort((a, b) => {
      const diff = (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name, "pl");
    })
    .slice(0, limit);
}
