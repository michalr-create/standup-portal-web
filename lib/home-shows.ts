/** Homepage Formaty: active shows only, newest first, capped. */
export const HOME_FORMAT_LIMIT = 8;
export const HOME_FORMAT_ACTIVE_MONTHS = 12;

export function selectHomeFormats<T extends { latestDate: string | null }>(
  sections: readonly T[],
  options?: {
    now?: Date;
    limit?: number;
    months?: number;
  },
): T[] {
  const now = options?.now ?? new Date();
  const limit = options?.limit ?? HOME_FORMAT_LIMIT;
  const months = options?.months ?? HOME_FORMAT_ACTIVE_MONTHS;

  const cutoff = new Date(now.getTime());
  cutoff.setMonth(cutoff.getMonth() - months);
  const cutoffMs = cutoff.getTime();

  return sections
    .filter((section) => {
      if (!section.latestDate) return false;
      const published = new Date(section.latestDate).getTime();
      return Number.isFinite(published) && published >= cutoffMs;
    })
    .sort(
      (a, b) =>
        new Date(b.latestDate as string).getTime() -
        new Date(a.latestDate as string).getTime(),
    )
    .slice(0, Math.max(0, limit));
}
