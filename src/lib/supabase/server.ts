import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { connection } from "next/server";
import type { Database } from "./database.types";
import { SUPABASE_PUBLIC_KEY, SUPABASE_URL, supabaseConfigured } from "./env";

/**
 * Per-request client that acts as the signed-in user (reads the session cookie).
 * Use only inside a <Suspense> boundary or a route handler. Null when not configured.
 */
export async function createClient() {
  if (!supabaseConfigured) return null;
  // Supabase checks token expiry with Date.now(), which Next refuses during a
  // prerender (including partial prefetches that can see cookies). Wait for the
  // real request so session reads always happen at request time.
  await connection();
  const cookieStore = await cookies();
  return createServerClient<Database>(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, which can't set cookies. Safe to
          // ignore: src/proxy.ts refreshes the session on every request.
        }
      },
    },
  });
}

/** Cookie-free client for public data (anon role). Safe inside `use cache`. */
export function createPublicClient() {
  if (!supabaseConfigured) return null;
  return createSupabaseClient<Database>(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
