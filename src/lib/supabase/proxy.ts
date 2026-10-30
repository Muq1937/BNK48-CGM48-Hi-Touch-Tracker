import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";
import { SUPABASE_PUBLIC_KEY, SUPABASE_URL, supabaseConfigured } from "./env";

/**
 * Refreshes the Supabase session cookie on each request (from Supabase's Next.js guide).
 * With `adminOnly`, anyone who isn't an admin gets the regular 404 page instead.
 */
export async function updateSession(request: NextRequest, { adminOnly = false } = {}) {
  let response = NextResponse.next({ request });
  if (!supabaseConfigured) return adminOnly ? notFound(request, response) : response;

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        // Cache-Control etc., so a CDN never caches a response carrying someone's session.
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Do not run code between createServerClient and getClaims(): it refreshes the token.
  const { data } = await supabase.auth.getClaims();

  if (adminOnly) {
    // Optimistic check; the admin layout and RLS check again next to the data.
    const userId = data?.claims?.sub;
    const { data: profile } = userId
      ? await supabase.from("profiles").select("role").eq("id", userId).maybeSingle()
      : { data: null };
    if (profile?.role !== "admin") return notFound(request, response);
  }

  // Return this response as-is so the refreshed cookies and headers reach the browser.
  return response;
}

/** Render the app's 404 (no such route) while keeping any refreshed session cookies. */
function notFound(request: NextRequest, sessionResponse: NextResponse) {
  const response = NextResponse.rewrite(new URL("/_admin-not-found", request.url));
  sessionResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  sessionResponse.headers.forEach((value, key) => {
    if (key.toLowerCase() === "cache-control") response.headers.set(key, value);
  });
  return response;
}
