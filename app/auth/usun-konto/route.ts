import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { postDeleteAccount, type DeleteUserResult } from "@/lib/delete-account";
import { getAdminSupabase } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readConfirmation(request: NextRequest): Promise<string> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const body: unknown = await request.json();
      if (!body || typeof body !== "object" || !("confirmation" in body)) return "";
      const value = (body as { confirmation: unknown }).confirmation;
      return typeof value === "string" ? value : "";
    } catch {
      return "";
    }
  }
  try {
    const form = await request.formData();
    const value = form.get("confirmation");
    return typeof value === "string" ? value : "";
  } catch {
    return "";
  }
}

function authFailureStatus(error: { status?: number; code?: string }): { gone: boolean; status?: number; code?: string } {
  const status = typeof error.status === "number" ? error.status : undefined;
  const code = typeof error.code === "string" ? error.code : undefined;
  return { gone: status === 404 || code === "user_not_found", status, code };
}

/**
 * Full document POST from the account form. The service role stays on the server.
 * The deleted id is the session user from getUser(), never a field in the body.
 */
export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const confirmation = await readConfirmation(request);
  if (!url || !key) {
    return NextResponse.redirect(new URL("/ulubione?usuniecie=blad", request.url), { status: 303 });
  }

  let response = NextResponse.redirect(new URL("/", request.url), { status: 303 });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const outcome = await postDeleteAccount(
    {
      origin: request.headers.get("origin"),
      referer: request.headers.get("referer"),
      requestOrigin: request.nextUrl.origin,
      accept: request.headers.get("accept"),
      confirmation,
    },
    {
      getUserId: async () => {
        const { data } = await supabase.auth.getUser();
        return data.user?.id ?? null;
      },
      deleteUser: async (userId) => {
        const { error } = await getAdminSupabase().auth.admin.deleteUser(userId, false);
        if (!error) return { ok: true } satisfies DeleteUserResult;
        const failure = authFailureStatus(error);
        if (failure.gone) return { ok: true, missing: true } satisfies DeleteUserResult;
        console.error("account delete failed", failure.status ?? failure.code ?? "unknown");
        return { ok: false } satisfies DeleteUserResult;
      },
    },
  );

  if (outcome.status === 303 && outcome.location) {
    response = NextResponse.redirect(new URL(outcome.location, request.url), { status: 303 });
    if (outcome.signOut) {
      try {
        const pending = supabase.auth.signOut({ scope: "local" });
        pending.catch(() => {});
        await Promise.race([
          pending,
          new Promise((resolve) => setTimeout(resolve, 4000)),
        ]);
      } catch {
        // A failed revoke must not turn a deleted account into a 500. Cookies still clear.
      }
    }
    return response;
  }

  return NextResponse.json(
    { error: outcome.error ?? "delete_failed" },
    { status: outcome.status },
  );
}
