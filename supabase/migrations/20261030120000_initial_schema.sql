-- High Touch Log: initial schema (handoff §6).
--
-- * Row Level Security is enabled on every table.
-- * Admin rights come only from profiles.role, which users can never change:
--   set it with SQL as the service role (see README).
-- * Grants are explicit so access does not depend on project defaults.
-- * Policies call (select auth.uid()) / (select private.is_admin()) so Postgres
--   evaluates them once per statement instead of once per row.
-- * SECURITY DEFINER helpers live in the `private` schema, which the Data API
--   does not expose, so they cannot be called as /rpc endpoints.

create schema if not exists private;
grant usage on schema private to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Profiles & roles

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- Create a profile for every new auth user.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(new.email, '@', 1)
    ), 80)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Roster

create table public.members (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  nickname text not null,
  full_name_th text,
  group_code text not null check (group_code in ('BNK48', 'CGM48')),
  photo_url text,
  photo_credit text,
  profile_url text,
  status text not null default 'active' check (status in ('active', 'graduated')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Events, rounds, lineups

create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_date date not null,
  venue text,
  city text,
  scope text not null check (scope in ('BNK48', 'CGM48', 'JOINT')),
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_by uuid references auth.users,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index events_status_date_idx on public.events (status, event_date desc);

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

create table public.rounds (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events on delete cascade,
  position int not null check (position > 0),
  label text, -- optional override, default "Round {position}"
  unique (event_id, position)
);

create table public.round_members (
  round_id uuid not null references public.rounds on delete cascade,
  member_id uuid not null references public.members,
  primary key (round_id, member_id)
);

create index round_members_member_idx on public.round_members (member_id);

-- ---------------------------------------------------------------------------
-- User data

create table public.log_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  round_id uuid not null references public.rounds on delete restrict,
  tickets int not null check (tickets > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, round_id)
);

create index log_entries_round_idx on public.log_entries (round_id);

create trigger log_entries_set_updated_at
  before update on public.log_entries
  for each row execute function public.set_updated_at();

create table public.event_notes (
  user_id uuid not null references auth.users on delete cascade,
  event_id uuid not null references public.events on delete cascade,
  note text not null check (char_length(note) between 1 and 500),
  primary key (user_id, event_id)
);

create index event_notes_event_idx on public.event_notes (event_id);

create table public.user_oshi (
  user_id uuid not null references auth.users on delete cascade,
  member_id uuid not null references public.members on delete cascade,
  primary key (user_id, member_id)
);

create index user_oshi_member_idx on public.user_oshi (member_id);

-- Later: fan suggestions
create table public.lineup_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  round_id uuid references public.rounds on delete cascade,
  event_id uuid references public.events on delete cascade,
  proposed_member_ids uuid[],
  comment text check (char_length(comment) <= 1000),
  status text not null default 'open' check (status in ('open', 'accepted', 'rejected')),
  created_at timestamptz not null default now()
);

create index lineup_suggestions_user_idx on public.lineup_suggestions (user_id);

-- Per-user counts. security_invoker makes RLS on log_entries apply.
create view public.member_counts
with (security_invoker = true)
as
select le.user_id, rm.member_id, sum(le.tickets)::int as times_met
from public.log_entries le
join public.round_members rm on rm.round_id = le.round_id
group by le.user_id, rm.member_id;

-- ---------------------------------------------------------------------------
-- Logging an event: adds tickets to existing rounds (never replaces) and
-- sets the event note, in one transaction. Runs as the caller, so RLS applies.

create or replace function public.log_event(p_event_id uuid, p_rounds jsonb, p_note text default null)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  item jsonb;
  rid uuid;
  n int;
begin
  if uid is null then
    raise exception 'Sign in to log events' using errcode = '42501';
  end if;

  for item in select * from jsonb_array_elements(coalesce(p_rounds, '[]'::jsonb)) loop
    rid := (item ->> 'round_id')::uuid;
    n := (item ->> 'tickets')::int;
    if n is null or n <= 0 then
      continue;
    end if;
    if not exists (select 1 from public.rounds where id = rid and event_id = p_event_id) then
      raise exception 'Round % is not part of event %', rid, p_event_id using errcode = '22023';
    end if;
    insert into public.log_entries (user_id, round_id, tickets)
    values (uid, rid, n)
    on conflict (user_id, round_id)
    do update set tickets = public.log_entries.tickets + excluded.tickets;
  end loop;

  if p_note is not null then
    if btrim(p_note) = '' then
      delete from public.event_notes where user_id = uid and event_id = p_event_id;
    else
      insert into public.event_notes (user_id, event_id, note)
      values (uid, p_event_id, btrim(p_note))
      on conflict (user_id, event_id) do update set note = excluded.note;
    end if;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security

alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.events enable row level security;
alter table public.rounds enable row level security;
alter table public.round_members enable row level security;
alter table public.log_entries enable row level security;
alter table public.event_notes enable row level security;
alter table public.user_oshi enable row level security;
alter table public.lineup_suggestions enable row level security;

-- profiles: read own row; update display_name only (column grant below).
create policy "profiles: read own" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- members: everyone reads; admins write.
create policy "members: public read" on public.members
  for select to anon, authenticated
  using (true);

create policy "members: admin write" on public.members
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- events: published (or any, for admins); admins write.
create policy "events: read published" on public.events
  for select to anon, authenticated
  using (status = 'published' or (select private.is_admin()));

create policy "events: admin write" on public.events
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- rounds / round_members: visible when the parent event is.
create policy "rounds: read if event visible" on public.rounds
  for select to anon, authenticated
  using (exists (
    select 1 from public.events e
    where e.id = rounds.event_id and (e.status = 'published' or (select private.is_admin()))
  ));

create policy "rounds: admin write" on public.rounds
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "round_members: read if event visible" on public.round_members
  for select to anon, authenticated
  using (exists (
    select 1 from public.rounds r
    join public.events e on e.id = r.event_id
    where r.id = round_members.round_id and (e.status = 'published' or (select private.is_admin()))
  ));

create policy "round_members: admin write" on public.round_members
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- User data: own rows only. Entries may only point at rounds the user can see
-- (so not at rounds of draft events).
create policy "log_entries: own" on public.log_entries
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.rounds r where r.id = log_entries.round_id)
  );

create policy "event_notes: own" on public.event_notes
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "user_oshi: own" on public.user_oshi
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- lineup_suggestions: users insert and read their own; admins read and update all.
create policy "suggestions: insert own" on public.lineup_suggestions
  for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'open');

create policy "suggestions: read own or admin" on public.lineup_suggestions
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

create policy "suggestions: admin update" on public.lineup_suggestions
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- Grants (explicit; RLS still decides which rows)

revoke all on public.profiles, public.members, public.events, public.rounds, public.round_members,
  public.log_entries, public.event_notes, public.user_oshi, public.lineup_suggestions,
  public.member_counts
  from anon, authenticated;

grant select on public.members, public.events, public.rounds, public.round_members to anon, authenticated;
grant insert, update, delete on public.members, public.events, public.rounds, public.round_members to authenticated;

grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

grant select, insert, update, delete on public.log_entries, public.event_notes, public.user_oshi to authenticated;
grant select, insert, update on public.lineup_suggestions to authenticated;
grant select on public.member_counts to authenticated;

revoke execute on function private.handle_new_user() from public, anon, authenticated;
revoke execute on function public.log_event(uuid, jsonb, text) from public, anon;
grant execute on function public.log_event(uuid, jsonb, text) to authenticated;
-- is_admin() is used inside policies that anon also evaluates. It lives in the
-- unexposed `private` schema, so this does not make it an /rpc endpoint.
revoke execute on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;
