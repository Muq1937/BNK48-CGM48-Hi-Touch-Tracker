import { cache } from "react";
import { createClient } from "./server";

/** Who is looking. Decided on the server so admin UI is never sent to non-admins. */
export type Viewer = { kind: "guest" } | { kind: "user"; displayName: string; isAdmin: boolean };

/** Reads the session cookie: call only inside a <Suspense> boundary. Deduped per request. */
export const getViewer = cache(async (): Promise<Viewer> => {
  const supabase = await createClient();
  if (!supabase) return { kind: "guest" };

  // getClaims() verifies the token; never trust getSession() on the server.
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { kind: "guest" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", userId)
    .maybeSingle();
  const email = typeof data.claims.email === "string" ? data.claims.email : "";
  return {
    kind: "user",
    displayName: profile?.display_name || email.split("@")[0] || "Fan",
    isAdmin: profile?.role === "admin",
  };
});
