import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSameOriginSignOut } from "@/lib/sign-out";

function home(request: NextRequest) {
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}

/**
 * Full document POST, not a server action. A server-action redirect keeps the
 * root layout mounted, so Konto and Admin stay on the client until a reload.
 * Cookies are written onto this redirect response; the next document starts signed out.
 */
export async function POST(request: NextRequest) {
  const response = home(request);
  if (
    !isSameOriginSignOut({
      origin: request.headers.get("origin"),
      referer: request.headers.get("referer"),
      requestOrigin: request.nextUrl.origin,
    })
  ) {
    return response;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

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

  try {
    // Local removes this browser's cookies before the revoke request, so a slow
    // auth API cannot keep the session. Cap the wait so the redirect still happens.
    const pending = supabase.auth.signOut({ scope: "local" });
    pending.catch(() => {});
    await Promise.race([
      pending,
      new Promise((resolve) => setTimeout(resolve, 4000)),
    ]);
  } catch {
    // A corrupt cookie must not turn logout into a 500. The redirect still runs.
  }
  return response;
}
