import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { shouldRefreshSession } from "@/lib/session-path";

function continueWithPath(request: NextRequest, pathname: string) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("x-pathname", pathname);
  return response;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  let response = continueWithPath(request, pathname);

  if (!shouldRefreshSession(pathname)) {
    return response;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return response;
  }

  // @supabase/ssr: refresh the cookie on this request only. getClaims()
  // verifies the JWT and refreshes it when it is about to expire. Nothing
  // may run between createServerClient and getClaims().
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = continueWithPath(request, pathname);
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.getClaims();

  response.headers.set("x-pathname", pathname);
  return response;
}

export const config = {
  // Keep this list aligned with SESSION_REFRESH_PREFIXES. No catch-all.
  matcher: [
    "/admin",
    "/admin/:path*",
    "/zaloguj",
    "/auth",
    "/auth/:path*",
    "/ulubione",
    "/konto",
    "/konto/:path*",
  ],
};
