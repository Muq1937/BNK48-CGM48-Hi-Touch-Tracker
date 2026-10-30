// Every UI string lives here so Thai/English i18n (M4) is a swap, not a hunt.
// Use typographic quotes and apostrophes (’ “ ”).

const plural = (n: number, one: string, many: string) => `${n.toLocaleString("en")} ${n === 1 ? one : many}`;

export const t = {
  appName: "High Touch Log",
  fanmade: "Fanmade",
  groups: "BNK48 · CGM48",

  nav: {
    label: "Main",
    dashboard: "Dashboard",
    members: "Members",
    events: "Events",
    history: "History",
  },

  header: {
    admin: "Admin",
    guest: "Guest",
    signIn: "Sign in",
    synced: "Synced",
  },

  hero: {
    title: "Your high touch history",
    body: "Pick the event, the rounds you entered and how many tickets you used. We count every member for you.",
    cta: "Log an event",
  },

  guestBanner: {
    title: "You’re using guest mode.",
    body: "Your log is saved in this browser only. Export a backup, or sign in to keep it synced.",
    export: "Export backup",
    exportCsv: "Download CSV",
    import: "Import backup",
    signIn: "Sign in to sync",
  },

  storage: {
    loading: "Loading your log…",
    unavailable:
      "This browser is blocking storage (private mode?). Your log works for now but will be lost when you close the tab. Export a backup before leaving.",
    recovered:
      "We couldn’t read your saved log, so we started a fresh one. The unreadable copy is kept in this browser under “htlog:corrupt-backup”.",
    full: "Your browser storage is full, so this wasn’t saved. Export a backup and free some space.",
  },

  summary: {
    label: "Summary",
    memberMeetings: "Member meetings",
    ticketsUsed: "Tickets used",
    acrossEvents: (n: number) => `across ${plural(n, "event", "events")}`,
    membersMet: "Members met",
    ofRoster: (n: number) => `of ${n.toLocaleString("en")} on the roster`,
    mostMet: "Most met",
    mostMetTimes: (n: number) => plural(n, "time", "times"),
    nobodyYet: "Nobody yet",
    logToStart: "Log an event to start counting.",
  },

  members: {
    title: "Members",
    filterLabel: "Filter by group",
    all: "All",
    searchLabel: "Search members",
    searchPlaceholder: "Search by name",
    noMatch: "No members match your search.",
    times: (n: number) => (n === 1 ? "time" : "times"),
    last: (date: string) => `last ${date}`,
    notYet: "not met yet",
    history: "History",
    historyLabel: (name: string) => `${name} history`,
    officialProfile: "Official profile",
    officialProfileLabel: (name: string, group: string) =>
      `${name} official ${group} profile (opens in a new tab)`,
    oshiOn: (name: string) => `Remove ${name} from your oshi`,
    oshiOff: (name: string) => `Mark ${name} as oshi`,
    photoAlt: (name: string, group: string) => `${name} of ${group}`,
    photoCredit: (group: string) => `Photo: ${group} official`,
    progressLabel: (name: string, n: number) => `${name}: ${plural(n, "time", "times")} met`,
  },

  sessions: {
    title: "Recent sessions",
    empty: "No sessions yet. Your logged events will show up here.",
    tickets: (n: number) => plural(n, "ticket", "tickets"),
    chip: (name: string, n: number) => `${name} ×${n}`,
  },

  log: {
    title: "Log an event",
    step1: "Event",
    step2: "Rounds and tickets",
    step3: "Note",
    notePlaceholder: "Optional. Anything you want to remember.",
    noEvents: "No events have been published yet.",
    pickEvent: "Pick an event to see its rounds.",
    eventNotListed: "Event not listed? Suggestions open once accounts launch.",
    emptyLineup: "Lineup not announced yet.",
    decrease: (round: string) => `Fewer tickets for ${round}`,
    increase: (round: string) => `More tickets for ${round}`,
    ticketsFor: (round: string) => `Tickets for ${round}`,
    alreadyLogged: (round: string, have: number, adding: number) =>
      adding > 0
        ? `You already logged ${plural(have, "ticket", "tickets")} for ${round} — adding ${adding} more.`
        : `You already logged ${plural(have, "ticket", "tickets")} for ${round}.`,
    preview: (tickets: number, meetings: number, members: number) =>
      `${plural(tickets, "ticket", "tickets")} · adds ${plural(meetings, "meeting", "meetings")} with ${plural(members, "member", "members")}.`,
    previewEmpty: "Add tickets to at least one round.",
    joint: "Joint",
    lineupLabel: (round: string) => `${round} lineup`,
    save: "Save to my log",
    saved: (event: string) => `Saved. ${event} is in your history.`,
  },

  backup: {
    importTitle: "Import a backup",
    chooseFile: "Choose a backup file (.json)",
    badJson: "That file isn’t a valid backup (not JSON).",
    badFormat: "That file isn’t a High Touch Log backup, or it’s from a newer version.",
    preview: (inserts: number, unchanged: number, conflicts: number) =>
      `${plural(inserts, "new round", "new rounds")}, ${plural(unchanged, "round", "rounds")} already the same, ${plural(conflicts, "difference", "differences")} to decide.`,
    nothingNew: "Everything in this file is already in your log.",
    conflictRound: (event: string, round: string) => `${event} · ${round}`,
    conflictNote: (event: string) => `${event} · note`,
    keepFile: (v: string) => `Keep file (${v})`,
    keepDevice: (v: string) => `Keep this device (${v})`,
    apply: "Import",
    cancel: "Cancel",
    done: "Backup imported.",
    unknownEvent: "Unknown event",
    unknownRound: "Unknown round",
  },

  memberPage: {
    back: "Back to dashboard",
    timesMet: "Times met",
    events: "Events",
    rank: "Rank",
    noRank: "–",
    byMonth: "By month",
    month: "Month",
    byMonthLabel: (name: string) => `Times met with ${name} per month, last 5 months`,
    everyRound: (name: string) => `Every round with ${name}`,
    with: (names: string) => `with ${names}`,
    solo: "solo lane",
    none: (name: string) => `You haven’t logged a round with ${name} yet.`,
    cta: (name: string) => `Log an event with ${name}`,
    tickets: (n: number) => `×${n}`,
  },

  welcome: {
    title: "Sign in is coming soon",
    body: "Accounts with sync and backup arrive in the next update. Until then, everything works in guest mode and stays in this browser.",
    continueGuest: "Continue as guest",
  },

  footer: {
    disclaimer:
      "High Touch Log is an unofficial fan project. It is not affiliated with BNK48, CGM48 or their management. Member names and photos belong to their owners.",
    guestStorage: "Guest mode: saved on this device",
    syncedStorage: "Synced to your account",
  },
} as const;

/** Event dates are calendar dates; format them without a timezone shift. */
export function formatDate(isoDate: string, style: "short" | "long" = "short"): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: style === "long" ? "numeric" : undefined,
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function formatMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  );
}
