export type AttendanceMode = "going" | "attended";

/** "Byłem" only after the start instant. Upcoming shows stay "Idę". */
export function attendanceMode(startsAt: string, now: Date): AttendanceMode {
  const time = new Date(startsAt).getTime();
  if (Number.isNaN(time)) return "going";
  return time <= now.getTime() ? "attended" : "going";
}

export function goingCountLabel(count: number): string | null {
  if (!Number.isInteger(count) || count <= 0) return null;
  if (count === 1) return "Idzie 1 osoba";
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `Idą ${count} osoby`;
  }
  return `Idzie ${count} osób`;
}

export function shownGoingCount(serverCount: number, wasGoing: boolean, isGoing: boolean): number {
  const base = Number.isInteger(serverCount) && serverCount > 0 ? serverCount : 0;
  const delta = Number(isGoing) - Number(wasGoing);
  return Math.max(0, base + delta);
}
