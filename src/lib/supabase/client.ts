import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { SUPABASE_PUBLIC_KEY, SUPABASE_URL, supabaseConfigured } from "./env";

/** Browser client (a singleton per tab). Null when Supabase is not configured. */
export function createClient() {
  if (!supabaseConfigured) return null;
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
}
