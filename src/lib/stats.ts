// The counting rule, as pure functions. Used by guest and signed-in modes.
//
//   timesMet(user, member) = Σ tickets of the user's log entries
//                            for rounds whose lineup contains member
//
// Counts are always derived from the *current* lineups, so an admin fixing a
// lineup corrects everyone's counts. Entries for rounds that are no longer in
// the catalog are ignored here (but never deleted from storage).

import type { GroupCode, LogEntry, PublicEvent, PublicMember, PublicRound, UserLog } from "./types";

export interface Catalog {
  events: PublicEvent[];
  members: PublicMember[];
  eventById: Map<string, PublicEvent>;
  memberById: Map<string, PublicMember>;
  roundById: Map<string, { round: PublicRound; event: PublicEvent }>;
}

export function buildCatalog(events: PublicEvent[], members: PublicMember[]): Catalog {
  const eventById = new Map(events.map((e) => [e.id, e]));
  const memberById = new Map(members.map((m) => [m.id, m]));
  const roundById = new Map<string, { round: PublicRound; event: PublicEvent }>();
  for (const event of events) {
    for (const round of event.rounds) roundById.set(round.id, { round, event });
  }
  return { events, members, eventById, memberById, roundById };
}

export interface ResolvedEntry {
  entry: LogEntry;
  round: PublicRound;
  event: PublicEvent;
  /** Known members of the round's lineup, deduplicated, in lineup order. */
  lineup: PublicMember[];
}

export function resolveEntries(entries: LogEntry[], catalog: Catalog): ResolvedEntry[] {
  const out: ResolvedEntry[] = [];
  for (const entry of entries) {
    if (!(entry.tickets > 0)) continue;
    const hit = catalog.roundById.get(entry.roundId);
    if (!hit) continue;
    out.push({ entry, round: hit.round, event: hit.event, lineup: lineupOf(hit.round, catalog) });
  }
  return out;
}

export function lineupOf(round: PublicRound, catalog: Catalog): PublicMember[] {
  const seen = new Set<string>();
  const lineup: PublicMember[] = [];
  for (const id of round.memberIds) {
    const member = catalog.memberById.get(id);
    if (member && !seen.has(id)) {
      seen.add(id);
      lineup.push(member);
    }
  }
  return lineup;
}

/** memberId -> times met. Members never met are absent. */
export function timesMet(entries: LogEntry[], catalog: Catalog): Map<string, number> {
  const counts = new Map<string, number>();
  for (const { entry, lineup } of resolveEntries(entries, catalog)) {
    for (const member of lineup) {
      counts.set(member.id, (counts.get(member.id) ?? 0) + entry.tickets);
    }
  }
  return counts;
}

/** memberId -> latest event date (YYYY-MM-DD) among logged rounds containing the member. */
export function lastMet(entries: LogEntry[], catalog: Catalog): Map<string, string> {
  const last = new Map<string, string>();
  for (const { event, lineup } of resolveEntries(entries, catalog)) {
    for (const member of lineup) {
      const prev = last.get(member.id);
      if (!prev || event.date > prev) last.set(member.id, event.date);
    }
  }
  return last;
}

export interface Summary {
  /** Σ tickets × lineup size */
  memberMeetings: number;
  meetingsByGroup: Record<GroupCode, number>;
  ticketsUsed: number;
  eventsAttended: number;
  membersMet: number;
  /** Active members in the roster. */
  rosterSize: number;
  mostMet: { member: PublicMember; timesMet: number } | null;
}

export function summarize(entries: LogEntry[], catalog: Catalog): Summary {
  const resolved = resolveEntries(entries, catalog);
  const meetingsByGroup: Record<GroupCode, number> = { BNK48: 0, CGM48: 0 };
  let memberMeetings = 0;
  let ticketsUsed = 0;
  const events = new Set<string>();
  for (const { entry, event, lineup } of resolved) {
    ticketsUsed += entry.tickets;
    memberMeetings += entry.tickets * lineup.length;
    for (const member of lineup) meetingsByGroup[member.group] += entry.tickets;
    events.add(event.id);
  }
  const standings = memberStandings(entries, catalog);
  const top = standings[0];
  return {
    memberMeetings,
    meetingsByGroup,
    ticketsUsed,
    eventsAttended: events.size,
    membersMet: standings.filter((s) => s.timesMet > 0).length,
    rosterSize: catalog.members.filter((m) => m.status === "active").length,
    mostMet: top && top.timesMet > 0 ? { member: top.member, timesMet: top.timesMet } : null,
  };
}

export interface MemberStanding {
  member: PublicMember;
  timesMet: number;
  lastMet: string | null;
  /** Competition rank ("1, 2, 2, 4") among members met; null if never met. */
  rank: number | null;
}

/** Every member in the catalog, sorted by times met (desc), then nickname. */
export function memberStandings(entries: LogEntry[], catalog: Catalog): MemberStanding[] {
  const counts = timesMet(entries, catalog);
  const last = lastMet(entries, catalog);
  const rows = catalog.members.map((member) => ({
    member,
    timesMet: counts.get(member.id) ?? 0,
    lastMet: last.get(member.id) ?? null,
    rank: null as number | null,
  }));
  rows.sort((a, b) => b.timesMet - a.timesMet || a.member.nickname.localeCompare(b.member.nickname));
  rows.forEach((row, i) => {
    if (row.timesMet === 0) return;
    const prev = rows[i - 1];
    row.rank = prev && prev.timesMet === row.timesMet ? prev.rank : i + 1;
  });
  return rows;
}

export interface Session {
  event: PublicEvent;
  tickets: number;
  rounds: { round: PublicRound; tickets: number }[];
  /** Members met in this event and how many times, most first. */
  members: { member: PublicMember; times: number }[];
  note: string | null;
}

/** One session per attended event, newest first. */
export function sessions(log: UserLog, catalog: Catalog): Session[] {
  const byEvent = new Map<string, Session>();
  for (const { entry, round, event, lineup } of resolveEntries(log.entries, catalog)) {
    let session = byEvent.get(event.id);
    if (!session) {
      session = { event, tickets: 0, rounds: [], members: [], note: log.notes[event.id] || null };
      byEvent.set(event.id, session);
    }
    session.tickets += entry.tickets;
    session.rounds.push({ round, tickets: entry.tickets });
    for (const member of lineup) {
      const chip = session.members.find((c) => c.member.id === member.id);
      if (chip) chip.times += entry.tickets;
      else session.members.push({ member, times: entry.tickets });
    }
  }
  const out = [...byEvent.values()];
  for (const s of out) {
    s.rounds.sort((a, b) => a.round.position - b.round.position);
    s.members.sort((a, b) => b.times - a.times || a.member.nickname.localeCompare(b.member.nickname));
  }
  out.sort((a, b) => b.event.date.localeCompare(a.event.date) || a.event.name.localeCompare(b.event.name));
  return out;
}

export interface MemberRound {
  event: PublicEvent;
  round: PublicRound;
  tickets: number;
  /** The rest of the round's lineup. */
  others: PublicMember[];
  note: string | null;
}

export interface MemberHistory {
  member: PublicMember;
  timesMet: number;
  events: number;
  rank: number | null;
  lastMet: string | null;
  /** Newest first. */
  rounds: MemberRound[];
}

export function memberHistory(memberId: string, log: UserLog, catalog: Catalog): MemberHistory | null {
  const member = catalog.memberById.get(memberId);
  if (!member) return null;
  const standing = memberStandings(log.entries, catalog).find((s) => s.member.id === memberId);
  const rounds: MemberRound[] = [];
  for (const { entry, round, event, lineup } of resolveEntries(log.entries, catalog)) {
    if (!lineup.some((m) => m.id === memberId)) continue;
    rounds.push({
      event,
      round,
      tickets: entry.tickets,
      others: lineup.filter((m) => m.id !== memberId),
      note: log.notes[event.id] || null,
    });
  }
  rounds.sort((a, b) => b.event.date.localeCompare(a.event.date) || a.round.position - b.round.position);
  return {
    member,
    timesMet: standing?.timesMet ?? 0,
    events: new Set(rounds.map((r) => r.event.id)).size,
    rank: standing?.rank ?? null,
    lastMet: standing?.lastMet ?? null,
    rounds,
  };
}

/**
 * Times met per calendar month for the `months` months ending with the month
 * of `now` (oldest first). Month keys are "YYYY-MM".
 */
export function monthlyCounts(
  memberId: string,
  entries: LogEntry[],
  catalog: Catalog,
  { months = 5, now = new Date() }: { months?: number; now?: Date } = {},
): { month: string; count: number }[] {
  const buckets: { month: string; count: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth() - i, 1));
    buckets.push({ month: d.toISOString().slice(0, 7), count: 0 });
  }
  const index = new Map(buckets.map((b) => [b.month, b]));
  for (const { entry, event, lineup } of resolveEntries(entries, catalog)) {
    if (!lineup.some((m) => m.id === memberId)) continue;
    const bucket = index.get(event.date.slice(0, 7));
    if (bucket) bucket.count += entry.tickets;
  }
  return buckets;
}

export interface SelectionPreview {
  tickets: number;
  meetings: number;
  /** Distinct members met by this selection. */
  members: number;
}

/** Live preview for the log panel: what saving this selection would add. */
export function previewSelection(
  selection: { roundId: string; tickets: number }[],
  catalog: Catalog,
): SelectionPreview {
  let tickets = 0;
  let meetings = 0;
  const members = new Set<string>();
  for (const { roundId, tickets: n } of selection) {
    if (!(n > 0)) continue;
    const hit = catalog.roundById.get(roundId);
    if (!hit) continue;
    const lineup = lineupOf(hit.round, catalog);
    tickets += n;
    meetings += n * lineup.length;
    for (const member of lineup) members.add(member.id);
  }
  return { tickets, meetings, members: members.size };
}
