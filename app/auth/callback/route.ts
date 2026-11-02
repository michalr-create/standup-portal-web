import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/safe-next";

const EMAIL_OTP_TYPES: readonly EmailOtpType[] = [
  "email",
  "magiclink",
  "signup",
  "invite",
  "recovery",
  "email_change",
];

function parseEmailOtpType(value: string | null): EmailOtpType | null {
  return value && (EMAIL_OTP_TYPES as readonly string[]).includes(value)
    ? (value as EmailOtpType)
    : null;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = parseEmailOtpType(url.searchParams.get("type"));
  const next = safeNextPath(url.searchParams.get("next"));

  const failureUrl = new URL("/zaloguj?error=auth", url.origin);

  if (!(tokenHash && type) && !code) {
    return NextResponse.redirect(failureUrl);
  }

  const successUrl = new URL(next, url.origin);
  let response = NextResponse.redirect(successUrl);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    }
  );

  // Token-hash flow (email links): works in any browser, no PKCE verifier cookie needed.
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) {
      return NextResponse.redirect(failureUrl);
    }
    return response;
  }

  // PKCE code flow (Google OAuth).
  const { error } = await supabase.auth.exchangeCodeForSession(code!);
  if (error) {
    return NextResponse.redirect(failureUrl);
  }

  return response;
}
