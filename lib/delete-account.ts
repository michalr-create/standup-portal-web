import { isSameOriginSignOut } from "./sign-out.ts";

/** The visitor must type this exact word. A second click is not confirmation. */
export const DELETE_ACCOUNT_PHRASE = "USUŃ";

export const DELETED_ACCOUNT_PATH = "/konto/usuniete";

export type DeleteUserResult = { ok: true; missing?: boolean } | { ok: false };

export type DeletionDeps = {
  getUserId: () => Promise<string | null>;
  /** Deletes that authenticated user only. The id is never taken from the request body. */
  deleteUser: (userId: string) => Promise<DeleteUserResult>;
};

export type DeletionResult = {
  status: 403 | 400 | 401 | 500 | 303;
  location: string;
  signOut: boolean;
  error?: "forbidden" | "confirmation" | "unauthorized" | "delete_failed";
};

export function confirmationMatches(value: string): boolean {
  return value.trim() === DELETE_ACCOUNT_PHRASE;
}

/**
 * Decides whether the signed-in user may be deleted.
 * `deleteUser` receives only the id from `getUserId`.
 */
export async function runAccountDeletion(input: {
  sameOrigin: boolean;
  confirmation: string;
  deps: DeletionDeps;
}): Promise<DeletionResult> {
  if (!input.sameOrigin) {
    return { status: 403, location: "/", signOut: false, error: "forbidden" };
  }
  if (!confirmationMatches(input.confirmation)) {
    return {
      status: 400,
      location: "/ulubione?usuniecie=potwierdzenie",
      signOut: false,
      error: "confirmation",
    };
  }
  const userId = await input.deps.getUserId();
  if (!userId) {
    return {
      status: 401,
      location: "/zaloguj?next=/ulubione",
      signOut: false,
      error: "unauthorized",
    };
  }
  let deleted: DeleteUserResult;
  try {
    deleted = await input.deps.deleteUser(userId);
  } catch {
    return {
      status: 500,
      location: "/ulubione?usuniecie=blad",
      signOut: false,
      error: "delete_failed",
    };
  }
  if (!deleted.ok) {
    return {
      status: 500,
      location: "/ulubione?usuniecie=blad",
      signOut: false,
      error: "delete_failed",
    };
  }
  return { status: 303, location: DELETED_ACCOUNT_PATH, signOut: true };
}

export function accountDeletionHttp(
  result: DeletionResult,
  accept: string | null,
): { status: number; location?: string; error?: string; signOut: boolean } {
  const header = accept ?? "";
  const json = header.includes("application/json") && !header.includes("text/html");
  if (!json || result.status === 303) {
    return { status: 303, location: result.location, signOut: result.signOut };
  }
  return { status: result.status, error: result.error, signOut: false };
}

export async function postDeleteAccount(
  request: {
    origin: string | null;
    referer: string | null;
    requestOrigin: string;
    accept: string | null;
    confirmation: string;
  },
  deps: DeletionDeps,
): Promise<{ status: number; location?: string; error?: string; signOut: boolean }> {
  const result = await runAccountDeletion({
    sameOrigin: isSameOriginSignOut({
      origin: request.origin,
      referer: request.referer,
      requestOrigin: request.requestOrigin,
    }),
    confirmation: request.confirmation,
    deps,
  });
  return accountDeletionHttp(result, request.accept);
}
