# High Touch Log

A fanmade web app for BNK48 and CGM48 fans to log high touch events and see how many times they have met each member. Unofficial; not affiliated with the groups or their management.

A fan picks the **event**, the **rounds** they entered and how many **tickets** they used per round. One ticket = meeting every member in that round's lineup once. Counts are always derived from log entries and the current lineups, never typed by hand.

## Status

| Milestone                                                                  | State                                           |
| -------------------------------------------------------------------------- | ----------------------------------------------- |
| M0 Setup (Next.js, TS, Tailwind, tokens, layout)                           | Done                                            |
| M1 Guest MVP (stats, local storage, dashboard, member page, export/import) | Done                                            |
| M2 Supabase + auth (schema, RLS, sign-in, account sync, guest merge)       | Code done; needs a Supabase project (see below) |
| M3 Admin                                                                   | Not started                                     |
| M4 Polish                                                                  | Not started                                     |

Without Supabase env vars the app runs guest-only on the sample fixture in `src/data/fixture.ts`.

## Getting started

Requires Node 20.9+.

```bash
npm install
vercel env pull .env.local   # or copy .env.example and fill it in; optional for guest-only
npm run dev                  # http://localhost:3000
```

| Script                        | What it does                                                               |
| ----------------------------- | -------------------------------------------------------------------------- |
| `npm run dev`                 | Dev server                                                                 |
| `npm run build` / `npm start` | Production build / serve                                                   |
| `npm test`                    | Vitest unit tests (pure logic in `src/lib`)                                |
| `npm run typecheck`           | Generate route types, then `tsc`                                           |
| `npm run lint`                | ESLint (`next build` no longer lints in Next 16)                           |
| `npm run format`              | Prettier                                                                   |
| `npm run db:push`             | Apply `supabase/migrations` to the database in `POSTGRES_URL_NON_POOLING`  |
| `npm run db:seed`             | Same, plus `supabase/seed.sql` (**sample** events and members)             |
| `npm run db:types`            | Regenerate `database.types.ts` (needs `npx supabase login` + `link` first) |

## Supabase

- Schema, RLS and grants: `supabase/migrations/`. Every table has RLS; access is also granted explicitly (new Supabase projects no longer expose tables by default).
- `SECURITY DEFINER` helpers (`is_admin`, the new-user trigger) live in the `private` schema so they are not callable through the Data API.
- Logging a round that already has an entry adds tickets, via the `log_event` function (one transaction).
- **Make someone an admin** (SQL editor, as the project owner):

  ```sql
  update public.profiles set role = 'admin'
  where id = (select id from auth.users where email = 'someone@example.com');
  ```

- **Auth URL configuration** (Authentication → URL Configuration): Site URL = the production URL; Redirect URLs = `http://localhost:3000/**`, the production URL with `/**`, and `https://*-muq1937s-projects.vercel.app/**` for previews.
- **Email links that work across browsers**: in Authentication → Emails, change the link in the _Magic link_ and _Confirm signup_ templates to
  `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email`. `/auth/callback` handles both this and the default code flow.

## Layout

```
src/
  app/                    routes: /, /members/[slug], /welcome, /welcome/merge, /settings, /auth/callback
  proxy.ts                refreshes the Supabase session (Next 16's middleware)
  components/             UI (client components read the log via LogProvider)
  data/fixture.ts         SAMPLE events and members (used when Supabase isn't configured)
  lib/
    types.ts              domain types
    stats.ts              the counting rule as pure functions
    guestStore.ts         localStorage format "htlog:v1", Zod schema, migrations
    repository.ts         LogRepository interface + LocalLogRepository
    merge.ts              merge/conflict logic (sign-in merge and backup import)
    backup.ts             JSON / CSV export, import parsing
    publicData.ts         cached read of published events + roster
    supabase/             clients, SupabaseLogRepository, row mappers, viewer, types
    strings.ts            every UI string (for i18n later)
supabase/
  migrations/             schema + RLS
  seed.sql                SAMPLE data
```

Business logic in `src/lib` is framework-free and unit tested. UI code only talks to `LogRepository`; `LogProvider` picks `LocalLogRepository` (guest) or `SupabaseLogRepository` (signed in).

## Notes

- **Next.js 16** with Cache Components and Partial Prefetching on. `middleware.ts` is now `src/proxy.ts`; `params` is a Promise; client components are prerendered, so localStorage is only read after mount; session reads sit inside `<Suspense>`. Bundled docs: `node_modules/next/dist/docs/`.
- **Supabase keys**: uses the current `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the legacy anon key name also works). Supabase is retiring anon/service_role keys by the end of 2026.
- **Member photos** are off unless `NEXT_PUBLIC_SHOW_MEMBER_PHOTOS=true`. When on, they load straight from the official source with a plain `<img>` (no proxy, no image optimiser).
- **Sample data**: the fixture and seed names (Fah, Mint, …) and events are placeholders, not real rosters.
