"use client";

import { Mail, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useId, useState } from "react";
import { useLog } from "@/components/LogProvider";
import { t } from "@/lib/strings";
import { createClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/env";

/** Where the auth provider sends the user back to; the merge screen decides what's next. */
function callbackUrl() {
  return `${window.location.origin}/auth/callback?next=/welcome/merge`;
}

const big =
  "flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-[14px] text-[15px] font-bold disabled:cursor-not-allowed disabled:opacity-50";

export function WelcomeView() {
  const { account } = useLog();
  const emailId = useId();
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const off = !supabaseConfigured;

  async function google() {
    setMessage(null);
    const { error } = (await createClient()?.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    })) ?? { error: null };
    if (error) {
      setStatus("error");
      setMessage(t.welcome.error);
    }
  }

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMessage(null);
    const { error } = (await createClient()?.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callbackUrl() },
    })) ?? { error: null };
    if (error) {
      setStatus("error");
      setMessage(t.welcome.error);
    } else {
      setStatus("sent");
      setMessage(t.welcome.checkEmail(email.trim()));
    }
  }

  return (
    <main className="mx-auto w-full max-w-md px-6 pt-8 pb-10">
      <h1 className="text-[30px] leading-tight font-extrabold tracking-tight">{t.welcome.title}</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-body-2">{t.welcome.body}</p>

      {account && (
        <p className="mt-5 rounded-card border border-line bg-surface p-4 text-sm">
          {t.welcome.signedInAs(account.displayName)}{" "}
          <Link href="/" className="font-bold underline underline-offset-2">
            {t.welcome.goToDashboard}
          </Link>
        </p>
      )}
      <Suspense fallback={null}>
        <CallbackError />
      </Suspense>
      {off && (
        <p className="mt-5 rounded-card border border-admin bg-[#FFF6DD] p-4 text-sm">
          {t.welcome.notConfigured}
        </p>
      )}

      <div className="mt-6 grid gap-2.5">
        <button
          type="button"
          onClick={google}
          disabled={off}
          className={`${big} border border-line-strong bg-surface`}
        >
          <GoogleMark />
          {t.welcome.google}
        </button>
        <button type="button" disabled className={`${big} border border-line-strong bg-surface`}>
          <MessageCircle size={18} aria-hidden="true" />
          {t.welcome.line}
          <span className="rounded-full bg-track px-2 py-0.5 text-[11px] font-bold text-body-2">
            {t.welcome.lineSoon}
          </span>
        </button>

        {!showEmail ? (
          <button
            type="button"
            onClick={() => setShowEmail(true)}
            disabled={off}
            className={`${big} bg-ink text-white`}
          >
            <Mail size={18} aria-hidden="true" />
            {t.welcome.email}
          </button>
        ) : (
          <form onSubmit={sendLink} className="grid gap-2 rounded-[14px] border border-line bg-surface p-3">
            <label htmlFor={emailId} className="text-sm font-semibold">
              {t.welcome.emailLabel}
            </label>
            <input
              id={emailId}
              type="email"
              required
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.welcome.emailPlaceholder}
              className="min-h-11 rounded-[10px] border border-line-strong bg-surface px-3 text-[15px] placeholder:text-muted"
            />
            <button
              type="submit"
              disabled={status === "sending" || status === "sent"}
              className={`${big} bg-ink text-white`}
            >
              {status === "sending" ? t.welcome.sending : t.welcome.sendLink}
            </button>
          </form>
        )}

        <p
          role={status === "error" ? "alert" : "status"}
          className={`min-h-5 text-sm ${status === "error" ? "text-[#B42318]" : "text-cgm-accent"}`}
        >
          {message}
        </p>

        <div className="flex items-center gap-3" aria-hidden="true">
          <div className="h-px flex-1 bg-line-strong" />
          <span className="text-xs font-semibold text-muted">{t.welcome.or}</span>
          <div className="h-px flex-1 bg-line-strong" />
        </div>

        <Link href="/" className={`${big} border-2 border-ink`}>
          {t.welcome.continueGuest}
        </Link>
        <p className="text-center text-xs leading-relaxed text-muted">{t.welcome.guestNote}</p>
      </div>

      <div className="mt-6 grid grid-cols-2 rounded-card border border-line bg-surface">
        <Compare title={t.welcome.compareGuest} points={t.welcome.compareGuestPoints} />
        <Compare
          title={t.welcome.compareAccount}
          points={t.welcome.compareAccountPoints}
          className="border-l border-track"
          titleClass="text-bnk-accent"
        />
      </div>
    </main>
  );
}

/** Errors handed back by /auth/callback as ?error=… */
function CallbackError() {
  const error = useSearchParams().get("error");
  if (!error) return null;
  return (
    <p
      role="alert"
      className="mt-5 rounded-card border border-[#B42318] bg-surface p-4 text-sm text-[#B42318]"
    >
      {error === "expired" ? t.welcome.linkExpired : t.welcome.error}
    </p>
  );
}

function Compare({
  title,
  points,
  className = "",
  titleClass = "",
}: {
  title: string;
  points: readonly string[];
  className?: string;
  titleClass?: string;
}) {
  return (
    <div className={`p-3.5 ${className}`}>
      <h2 className={`text-[13px] font-extrabold ${titleClass}`}>{title}</h2>
      <ul className="mt-2 grid gap-2 text-xs leading-snug text-body-2">
        {points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </div>
  );
}

/** Monochrome "G" mark (no official logo colours, per the unofficial-branding rule). */
function GoogleMark() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      aria-hidden="true"
    >
      <path d="M20 12.2c0-.6-.1-1.2-.2-1.7H12v3.3h4.5a4 4 0 0 1-1.7 2.6" strokeLinecap="round" />
      <path d="M18.4 17.5A8 8 0 1 1 17.6 6.4" strokeLinecap="round" />
    </svg>
  );
}
