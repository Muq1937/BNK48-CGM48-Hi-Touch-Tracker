import type { Metadata } from "next";
import Link from "next/link";
import { t } from "@/lib/strings";

export const metadata: Metadata = { title: "Sign in" };

// Placeholder until M2 adds Supabase Auth (Google + email magic link).
export default function WelcomePage() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="text-2xl font-extrabold tracking-tight">{t.welcome.title}</h1>
      <p className="mt-3 text-body-2">{t.welcome.body}</p>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-ink px-4 text-sm font-bold text-white"
      >
        {t.welcome.continueGuest}
      </Link>
    </main>
  );
}
