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
    accountLoadFailed:
      "We couldn’t load your log from your account. Check your connection and reload the page.",
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
    saveFailed: "That didn’t save. Check your connection and try again.",
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
    title: "Count every high touch with BNK48 and CGM48",
    body: "Sign in to keep your log safe and synced, or start right away as a guest.",
    google: "Continue with Google",
    line: "Continue with LINE",
    lineSoon: "Coming soon",
    email: "Continue with email",
    emailLabel: "Email address",
    emailPlaceholder: "you@example.com",
    sendLink: "Send sign-in link",
    sending: "Sending…",
    checkEmail: (email: string) => `Check ${email} for a sign-in link. You can close this tab.`,
    or: "or",
    continueGuest: "Continue as guest",
    guestNote: "No account needed. You can sign in later and keep everything you’ve logged.",
    compareGuest: "Guest",
    compareGuestPoints: [
      "Saved on this device only",
      "Back up by exporting a file",
      "Lost if browser data is cleared",
    ],
    compareAccount: "Account",
    compareAccountPoints: ["Synced on phone and computer", "Backed up automatically", "Suggest lineup fixes"],
    notConfigured:
      "Sign-in isn’t switched on for this site yet. Everything works in guest mode in the meantime.",
    signedInAs: (name: string) => `You’re signed in as ${name}.`,
    goToDashboard: "Go to dashboard",
    error: "Sign-in didn’t work. Please try again.",
    linkExpired: "That sign-in link has expired or was already used. Request a new one.",
  },

  merge: {
    welcome: (name: string) => `Welcome, ${name}`,
    found: "We found a guest log saved on this device. Want to bring it into your account?",
    onDevice: "On this device",
    events: "events",
    tickets: "tickets",
    membersMet: "members met",
    more: (n: number) => `+${n} more`,
    question: "What should we do with it?",
    add: "Add to my account",
    recommended: "Recommended",
    addBody: "If a round is in both logs, we’ll ask which ticket count to keep, so nothing is counted twice.",
    notNow: "Not now",
    notNowBody: "Leave it on this device. You can add it later from Settings.",
    continue: "Continue",
    keepNote: "Your guest copy stays on this device until you remove it.",
    conflictsTitle: "Some rounds are in both logs",
    conflictsBody: "Pick which ticket count to keep for each one. Nothing is added together.",
    keepAccount: (v: string) => `Keep account (${v})`,
    keepDevice: (v: string) => `Keep this device (${v})`,
    working: "Adding to your account…",
    done: "Your guest log is in your account.",
    failed: "We couldn’t add your guest log. Nothing was lost; try again from Settings.",
  },

  settings: {
    title: "Settings",
    account: "Account",
    signedInAs: (name: string, email: string) => `Signed in as ${name} (${email})`,
    signOut: "Sign out",
    guestLog: "Guest log on this device",
    guestLogSummary: (events: number, tickets: number) =>
      `${plural(events, "event", "events")}, ${plural(tickets, "ticket", "tickets")} saved in this browser.`,
    guestLogEmpty: "There’s no guest log on this device.",
    mergedAt: (date: string) => `Added to your account on ${date}.`,
    addToAccount: "Add to my account",
    removeGuest: "Remove guest copy from this device",
    removeConfirm:
      "Remove the guest log from this browser? Anything not added to your account will be lost. Export a backup first if unsure.",
    removed: "Guest copy removed from this device.",
    signInFirst: "Sign in to manage your account.",
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
