export type PushSubscribePlan = "insert" | "update" | "reject";

/**
 * A push endpoint is a capability URL. If it is already stored for another
 * account, the caller must not take it over — not by upsert, not by delete
 * and reinsert.
 */
export function planPushSubscribe(existingUserId: string | null, userId: string): PushSubscribePlan {
  if (existingUserId == null) return "insert";
  if (existingUserId === userId) return "update";
  return "reject";
}
