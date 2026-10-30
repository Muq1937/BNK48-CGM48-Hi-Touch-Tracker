import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next 16's replacement for middleware.ts. Refreshes the auth session on every
// request, and answers 404 on /admin for anyone who isn't an admin. That role
// check is repeated in the admin layout, in every admin action and by RLS.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const adminOnly = pathname === "/admin" || pathname.startsWith("/admin/");
  return updateSession(request, { adminOnly });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
