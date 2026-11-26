import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { openMicMiddlewareRedirect } from "@/lib/open-mic-cities";
import { aliasRedirectUrl, aliasSection, lookupAliasSlug } from "@/lib/slug-alias-middleware";
import { shouldRefreshSession } from "@/lib/session-path";

/**
 * 308 before the app renders. loading.tsx puts the page in Suspense, and a
 * permanentRedirect after that streams a 200 with a meta refresh.
 */
async function historicalSlugRedirect(request: NextRequest): Promise<NextResponse | null> {
  const parsed = aliasSection(request.nextUrl.pathname);
  if (!parsed) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const canonical = await lookupAliasSlug(parsed.section, parsed.slug, { url, key });
  const target = aliasRedirectUrl(request.nextUrl, parsed.section, parsed.slug, canonical);
  if (!target) return null;
  return NextResponse.redirect(target, 308);
}

function continueWithPath(request: NextRequest, pathname: string) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("x-pathname", pathname);
  return response;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const aliasRedirect = await historicalSlugRedirect(request);
  if (aliasRedirect) return aliasRedirect;

  const openMicTarget = openMicMiddlewareRedirect(request.nextUrl);
  if (openMicTarget) return NextResponse.redirect(openMicTarget, 308);

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
  // Session prefixes stay aligned with SESSION_REFRESH_PREFIXES. No catch-all.
  // Standuper and format paths only resolve a historical slug before render.
  matcher: [
    "/admin",
    "/admin/:path*",
    "/zaloguj",
    "/auth",
    "/auth/:path*",
    "/ulubione",
    "/ulubione/:path*",
    "/konto",
    "/konto/:path*",
    "/zglos",
    "/zglos/:path*",
    "/standuper/:slug",
    "/format/:slug",
    "/open-mic",
    "/open-mic/:path*",
  ],
};
