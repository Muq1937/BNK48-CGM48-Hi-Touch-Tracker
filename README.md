# High Touch Log

A fanmade web app for BNK48 and CGM48 fans to log high touch events and see how many times they have met each member. Unofficial; not affiliated with the groups or their management.

A fan picks the **event**, the **rounds** they entered and how many **tickets** they used per round. One ticket = meeting every member in that round's lineup once. Counts are always derived from log entries and the current lineups, never typed by hand.

## Status

| Milestone                                                                  | State                                                 |
| -------------------------------------------------------------------------- | ----------------------------------------------------- |
| M0 Setup (Next.js, TS, Tailwind, tokens, layout)                           | Done                                                  |
| M1 Guest MVP (stats, local storage, dashboard, member page, export/import) | Done; uses **sample data** from `src/data/fixture.ts` |
| M2 Supabase + auth                                                         | Not started                                           |
| M3 Admin                                                                   | Not started                                           |
| M4 Polish                                                                  | Not started                                           |

## Getting started

Requires Node 20.9+.

```bash
npm install
cp .env.example .env.local   # nothing is required yet in M1
npm run dev                  # http://localhost:3000
```

| Script                        | What it does                                     |
| ----------------------------- | ------------------------------------------------ |
| `npm run dev`                 | Dev server                                       |
| `npm run build` / `npm start` | Production build / serve                         |
| `npm test`                    | Vitest unit tests (pure logic in `src/lib`)      |
| `npm run typecheck`           | Generate route types, then `tsc`                 |
| `npm run lint`                | ESLint (`next build` no longer lints in Next 16) |
| `npm run format`              | Prettier                                         |

## Layout

```
src/
  app/                    routes: / , /members/[slug], /welcome (placeholder)
  components/             UI (client components read the log via LogProvider)
  data/fixture.ts         SAMPLE events and members (placeholder names)
  lib/
    types.ts              domain types
    stats.ts              the counting rule as pure functions
    guestStore.ts         localStorage format "htlog:v1", Zod schema, migrations
    repository.ts         LogRepository interface + LocalLogRepository
    merge.ts              merge/conflict logic (sign-in merge and backup import)
    backup.ts             JSON / CSV export, import parsing
    strings.ts            every UI string (for i18n later)
```

Business logic in `src/lib` is framework-free and unit tested. UI code only talks to `LogRepository`, so adding `SupabaseLogRepository` in M2 does not change components.

## Notes

- **Next.js 16** with Cache Components and Partial Prefetching on. `middleware.ts` is now `src/proxy.ts`; `params` is a Promise; client components are prerendered, so localStorage is only read after mount. Bundled docs: `node_modules/next/dist/docs/`.
- **Member photos** are off unless `NEXT_PUBLIC_SHOW_MEMBER_PHOTOS=true`. When on, they load straight from the official source with a plain `<img>` (no proxy, no image optimiser).
- **Sample data**: the fixture names (Fah, Mint, …) and events are placeholders, not real rosters.
