"use client";

import { ArrowUpRight, Star } from "lucide-react";
import { useState } from "react";
import { SHOW_MEMBER_PHOTOS, groupClasses, profileUrl } from "@/lib/groups";
import { t } from "@/lib/strings";
import type { GroupCode, PublicMember } from "@/lib/types";

export function GroupPill({ group, className = "" }: { group: GroupCode; className?: string }) {
  const c = groupClasses[group];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide ${c.tint} ${c.text} ${className}`}
    >
      {group}
    </span>
  );
}

/** Portrait with a silhouette fallback on the group tint. Never proxied or re-hosted. */
export function MemberPhoto({
  member,
  width,
  height,
}: {
  member: PublicMember;
  width: number;
  height: number;
}) {
  const [failed, setFailed] = useState(false);
  const c = groupClasses[member.group];
  const showPhoto = SHOW_MEMBER_PHOTOS && member.photoUrl && !failed;
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-[10px] ${c.tint}`} style={{ width, height }}>
      {showPhoto ? (
        // A plain <img> on purpose: official photos must not go through an image optimiser.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={member.photoUrl}
          alt={t.members.photoAlt(member.nickname, member.group)}
          width={width}
          height={height}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <svg viewBox="0 0 64 80" className={`h-full w-full ${c.text} opacity-35`} aria-hidden="true">
          <circle cx="32" cy="30" r="13" fill="currentColor" />
          <path d="M8 80c0-16 10.7-26 24-26s24 10 24 26z" fill="currentColor" />
        </svg>
      )}
    </div>
  );
}

export function PhotoCredit({ member }: { member: PublicMember }) {
  if (!SHOW_MEMBER_PHOTOS || !member.photoUrl) return null;
  return (
    <p className="text-[11px] text-muted">{member.photoCredit || t.members.photoCredit(member.group)}</p>
  );
}

export function ProfileLink({ member, className = "" }: { member: PublicMember; className?: string }) {
  return (
    <a
      href={profileUrl(member)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t.members.officialProfileLabel(member.nickname, member.group)}
      className={`inline-flex items-center gap-0.5 text-xs font-semibold underline-offset-2 hover:underline ${className}`}
    >
      {t.members.officialProfile}
      <ArrowUpRight size={13} aria-hidden="true" />
    </a>
  );
}

export function OshiToggle({
  member,
  on,
  onChange,
  disabled,
  tone = "light",
}: {
  member: PublicMember;
  on: boolean;
  onChange: (on: boolean) => void;
  disabled?: boolean;
  tone?: "light" | "dark";
}) {
  const color =
    tone === "dark" ? (on ? "text-admin" : "text-white/85") : on ? "text-[#9A6B00]" : "text-muted";
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? t.members.oshiOn(member.nickname) : t.members.oshiOff(member.nickname)}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`-m-2.5 inline-flex h-11 w-11 items-center justify-center rounded-full ${color} disabled:opacity-40`}
    >
      <Star size={18} fill={on ? "currentColor" : "none"} strokeWidth={2} aria-hidden="true" />
    </button>
  );
}

export function ProgressBar({
  value,
  max,
  className,
  label,
}: {
  value: number;
  max: number;
  className: string;
  label: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className="h-[5px] w-full overflow-hidden rounded-full bg-track"
    >
      <div className={`h-full rounded-full ${className}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-card border border-line bg-surface ${className}`}>{children}</div>;
}
