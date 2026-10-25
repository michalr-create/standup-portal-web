/** Litera indeksu A–Z z polskimi znakami, w kolejności alfabetu. */
export const DIRECTORY_LETTERS = [
  "A",
  "\u0104",
  "B",
  "C",
  "\u0106",
  "D",
  "E",
  "\u0118",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "\u0141",
  "M",
  "N",
  "\u0143",
  "O",
  "\u00d3",
  "P",
  "Q",
  "R",
  "S",
  "\u015a",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
  "\u0179",
  "\u017b",
] as const;

export function directoryLetter(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "#";
  const first = Array.from(trimmed)[0] ?? "#";
  return first.toLocaleUpperCase("pl-PL");
}

export function groupPeopleByLetter<T extends { name: string }>(
  people: readonly T[],
): { letter: string; people: T[] }[] {
  const groups: { letter: string; people: T[] }[] = [];
  for (const person of people) {
    const letter = directoryLetter(person.name);
    const last = groups[groups.length - 1];
    if (last && last.letter === letter) last.people.push(person);
    else groups.push({ letter, people: [person] });
  }
  return groups;
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
