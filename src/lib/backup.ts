// Export / import of the guest log. Import uses the same validation and
// migrations as reading localStorage, then the same merge rules as sign-in.

import { migrateGuestStore, type GuestStore } from "./guestStore";
import { lineupOf, type Catalog } from "./stats";
import { roundLabel, type LogEntry } from "./types";

/** The backup file excludes the public-data cache: it can be re-fetched. */
export function exportJson(store: GuestStore): string {
  return JSON.stringify({ ...store, cache: undefined }, null, 2);
}

export type ParseResult = { ok: true; store: GuestStore } | { ok: false; error: "json" | "format" };

export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "json" };
  }
  try {
    return { ok: true, store: migrateGuestStore(raw) };
  } catch {
    return { ok: false, error: "format" };
  }
}

const CSV_HEADER = [
  "event_date",
  "event",
  "city",
  "round",
  "tickets",
  "lineup",
  "note",
  "event_id",
  "round_id",
];

export function exportCsv(entries: LogEntry[], notes: Record<string, string>, catalog: Catalog): string {
  const rows = entries.map((entry) => {
    const hit = catalog.roundById.get(entry.roundId);
    const event = hit?.event ?? catalog.eventById.get(entry.eventId);
    return [
      event?.date ?? "",
      event?.name ?? "",
      event?.city ?? "",
      hit ? roundLabel(hit.round) : "",
      String(entry.tickets),
      hit
        ? lineupOf(hit.round, catalog)
            .map((m) => m.nickname)
            .join(" / ")
        : "",
      notes[entry.eventId] ?? "",
      entry.eventId,
      entry.roundId,
    ];
  });
  rows.sort((a, b) => b[0].localeCompare(a[0]) || a[3].localeCompare(b[3]));
  return [CSV_HEADER, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

function csvCell(value: string): string {
  // Neutralise spreadsheet formula injection, then quote if needed.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function backupFileName(ext: "json" | "csv", now: Date): string {
  return `hi-touch-log-${now.toISOString().slice(0, 10)}.${ext}`;
}
