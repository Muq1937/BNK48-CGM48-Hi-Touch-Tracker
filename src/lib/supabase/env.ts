// Public Supabase settings. Literal process.env reads so Next can inline them.
// Accepts the newer publishable key name and the legacy anon key name.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/** False until the Supabase env vars are set; the app then runs in guest-only mode. */
export const supabaseConfigured = SUPABASE_URL !== "" && SUPABASE_PUBLIC_KEY !== "";
