// Domain types shared by guest and signed-in modes. Framework-free.

export const GROUPS = ["BNK48", "CGM48"] as const;
export type GroupCode = (typeof GROUPS)[number];
export type EventScope = GroupCode | "JOINT";

export interface PublicMember {
  id: string;
  slug: string;
  nickname: string;
  fullNameTh?: string;
  group: GroupCode;
  photoUrl?: string;
  photoCredit?: string;
  profileUrl?: string;
  status: "active" | "graduated";
}

export interface PublicRound {
  id: string;
  position: number;
  /** Optional override; defaults to "Round {position}". */
  label?: string;
  memberIds: string[];
}

/** A published event with its rounds and lineups. */
export interface PublicEvent {
  id: string;
  name: string;
  /** ISO calendar date, YYYY-MM-DD. */
  date: string;
  venue?: string;
  city?: string;
  scope: EventScope;
  rounds: PublicRound[];
}

/** A user's ticket count for one round. One entry per round. */
export interface LogEntry {
  eventId: string;
  roundId: string;
  tickets: number;
  updatedAt: string;
}

/** Everything a user owns, independent of where it is stored. */
export interface UserLog {
  entries: LogEntry[];
  /** eventId -> note */
  notes: Record<string, string>;
  /** member ids */
  oshi: string[];
}

export function roundLabel(round: Pick<PublicRound, "position" | "label">): string {
  return round.label?.trim() || `Round ${round.position}`;
}
