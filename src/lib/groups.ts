import type { GroupCode, PublicMember } from "./types";

export const GROUP_HOMEPAGE: Record<GroupCode, string> = {
  BNK48: "https://bnk48.com",
  CGM48: "https://cgm48official.com",
};

/** Literal class names per group so Tailwind can see them. */
export const groupClasses: Record<
  GroupCode,
  { text: string; bg: string; tint: string; bright: string; border: string }
> = {
  BNK48: {
    text: "text-bnk-accent",
    bg: "bg-bnk-accent",
    tint: "bg-bnk-tint",
    bright: "bg-bnk-bright",
    border: "border-bnk-accent",
  },
  CGM48: {
    text: "text-cgm-accent",
    bg: "bg-cgm-accent",
    tint: "bg-cgm-tint",
    bright: "bg-cgm-bright",
    border: "border-cgm-accent",
  },
};

export function profileUrl(member: PublicMember): string {
  return member.profileUrl || GROUP_HOMEPAGE[member.group];
}

/** Photos are off unless explicitly enabled (official photos are copyrighted). */
export const SHOW_MEMBER_PHOTOS = process.env.NEXT_PUBLIC_SHOW_MEMBER_PHOTOS === "true";
