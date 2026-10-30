import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Where Google sign-in and email links land.
 * - `code`: OAuth / PKCE flow (must finish in the browser that started it).
 * - `token_hash` + `type`: email link from the customised template, which
 *   works even when the email is opened in another browser or device.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const params = url.searchParams;
  const next = safeNext(params.get("next"));

  const supabase = await createClient();
  if (supabase) {
    const code = params.get("code");
    const tokenHash = params.get("token_hash");
    const type = params.get("type") as EmailOtpType | null;

    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : tokenHash && type
        ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
        : { error: new Error("missing code") };

    if (!error) return NextResponse.redirect(new URL(next, origin(request)));
  }

  const reason =
    params.get("error_code") === "otp_expired" || params.get("token_hash") ? "expired" : "failed";
  return NextResponse.redirect(new URL(`/welcome?error=${reason}`, origin(request)));
}

/** Only same-site relative paths, to avoid open redirects. */
function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}

/** Behind Vercel's proxy, the public host and scheme are in x-forwarded-*. */
function origin(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host");
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0];
  if (host && (proto === "https" || proto === "http")) return `${proto}://${host}`;
  return new URL(request.url).origin;
}
