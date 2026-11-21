export function isCenterSnap(scrollSnapAlign: string): boolean {
  return scrollSnapAlign.trim().split(/\s+/).includes("center");
}

/** Desktop arrows keep the previous page step: 80% of the visible row. */
export function scrollLeftByPage(input: {
  scrollLeft: number;
  clientWidth: number;
  maxScroll: number;
  direction: "left" | "right";
}): number {
  const amount = input.clientWidth * 0.8;
  const delta = input.direction === "left" ? -amount : amount;
  return clamp(input.scrollLeft + delta, 0, input.maxScroll);
}

/** Index of the card whose center is nearest the scrollport center. */
export function closestScrollCardIndex(centers: number[], portCenter: number): number {
  let current = 0;
  let best = Infinity;
  for (let i = 0; i < centers.length; i++) {
    const dist = Math.abs(centers[i] - portCenter);
    if (dist < best) {
      best = dist;
      current = i;
    }
  }
  return current;
}

export function nextScrollCardIndex(
  centers: number[],
  portCenter: number,
  direction: "left" | "right",
): number {
  if (centers.length === 0) return 0;
  const current = closestScrollCardIndex(centers, portCenter);
  const delta = direction === "left" ? -1 : 1;
  return clamp(current + delta, 0, centers.length - 1);
}

/**
 * scrollLeft that places cardCenter on portCenter.
 * Card and port centers are both in viewport coordinates.
 */
export function scrollLeftToCenter(input: {
  scrollLeft: number;
  cardCenter: number;
  portCenter: number;
  maxScroll: number;
}): number {
  const next = input.scrollLeft + (input.cardCenter - input.portCenter);
  if (!Number.isFinite(next)) return 0;
  return clamp(next, 0, input.maxScroll);
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}
