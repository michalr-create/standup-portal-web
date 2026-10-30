import { createHash, timingSafeEqual } from "node:crypto";

/** Compare secrets without leaking the expected value through an early length check. */
export function secretsMatch(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
