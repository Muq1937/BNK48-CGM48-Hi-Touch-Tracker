-- M3: admin event builder and editing your own log.
--
-- No table changes. Three functions:
-- * public.set_event_log   fans correct or remove what they logged for an event.
-- * public.save_event      admins save an event with its rounds and lineups in one transaction.
-- * public.admin_log_usage admins see how many fans logged each event and round.
--
-- Deleting a round that has log entries stays impossible: log_entries.round_id
-- is ON DELETE RESTRICT, which Postgres enforces regardless of RLS.

-- ---------------------------------------------------------------------------
-- Editing your own log: sets (never adds) each round's tickets; 0 removes the
-- entry. Runs as the caller, so RLS keeps it to the caller's own rows.

create or replace function public.set_event_log(p_event_id uuid, p_rounds jsonb, p_note text default null)
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
    raise exception 'Sign in to edit your log' using errcode = '42501';
  end if;

  for item in select * from jsonb_array_elements(coalesce(p_rounds, '[]'::jsonb)) loop
    rid := (item ->> 'round_id')::uuid;
    n := coalesce((item ->> 'tickets')::int, 0);
    if n < 0 then
      raise exception 'Tickets cannot be negative' using errcode = '22023';
    end if;
    if n = 0 then
      delete from public.log_entries where user_id = uid and round_id = rid;
      continue;
    end if;
    if not exists (select 1 from public.rounds where id = rid and event_id = p_event_id) then
      raise exception 'Round % is not part of event %', rid, p_event_id using errcode = '22023';
    end if;
    insert into public.log_entries (user_id, round_id, tickets)
    values (uid, rid, n)
    on conflict (user_id, round_id)
    do update set tickets = excluded.tickets;
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
-- Admin: save an event, its rounds (in order) and their lineups.
--
-- p_event = {
--   "id": uuid | null,            -- null creates a new event
--   "name", "event_date", "venue", "city", "scope", "status",
--   "rounds": [{ "id": uuid | null, "label": text | null, "member_ids": [uuid] }]
-- }
-- Rounds missing from the list are deleted (fails if fans logged them).
-- Runs as the caller: RLS only lets admins write events, rounds and lineups.

create or replace function public.save_event(p_event jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  eid uuid := nullif(p_event ->> 'id', '')::uuid;
  item jsonb;
  rid uuid;
  pos int := 0;
  keep uuid[];
begin
  if not (select private.is_admin()) then
    raise exception 'Only admins can save events' using errcode = '42501';
  end if;

  if eid is null then
    insert into public.events (name, event_date, venue, city, scope, status, created_by)
    values (
      btrim(p_event ->> 'name'),
      (p_event ->> 'event_date')::date,
      nullif(btrim(p_event ->> 'venue'), ''),
      nullif(btrim(p_event ->> 'city'), ''),
      p_event ->> 'scope',
      p_event ->> 'status',
      (select auth.uid())
    )
    returning id into eid;
  else
    update public.events set
      name = btrim(p_event ->> 'name'),
      event_date = (p_event ->> 'event_date')::date,
      venue = nullif(btrim(p_event ->> 'venue'), ''),
      city = nullif(btrim(p_event ->> 'city'), ''),
      scope = p_event ->> 'scope',
      status = p_event ->> 'status'
    where id = eid;
    if not found then
      raise exception 'Event % not found', eid using errcode = 'P0002';
    end if;
  end if;

  select coalesce(array_agg((r ->> 'id')::uuid), '{}')
  into keep
  from jsonb_array_elements(coalesce(p_event -> 'rounds', '[]'::jsonb)) r
  where nullif(r ->> 'id', '') is not null;

  -- Removed rounds go first. A round with log entries makes this fail (RESTRICT).
  delete from public.rounds where event_id = eid and id <> all (keep);

  -- Park the remaining rounds out of the way so positions can be reassigned
  -- without tripping unique (event_id, position).
  update public.rounds set position = position + 10000 where event_id = eid;

  for item in select * from jsonb_array_elements(coalesce(p_event -> 'rounds', '[]'::jsonb)) loop
    pos := pos + 1;
    rid := nullif(item ->> 'id', '')::uuid;
    if rid is null then
      insert into public.rounds (event_id, position, label)
      values (eid, pos, nullif(btrim(item ->> 'label'), ''))
      returning id into rid;
    else
      update public.rounds
      set position = pos, label = nullif(btrim(item ->> 'label'), '')
      where id = rid and event_id = eid;
      if not found then
        raise exception 'Round % is not part of event %', rid, eid using errcode = '22023';
      end if;
    end if;

    delete from public.round_members where round_id = rid;
    insert into public.round_members (round_id, member_id)
    select rid, m::uuid
    from jsonb_array_elements_text(coalesce(item -> 'member_ids', '[]'::jsonb)) m
    on conflict do nothing;
  end loop;

  return eid;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: how many fans logged each event and round. RLS hides other users'
-- log entries even from admins, so the count runs as SECURITY DEFINER in the
-- unexposed `private` schema and returns numbers only, never who logged.
-- Rows with round_id null are per-event totals (distinct fans).

create or replace function private.log_usage()
returns table (event_id uuid, round_id uuid, fans bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select r.event_id, le.round_id, count(distinct le.user_id)
  from public.log_entries le
  join public.rounds r on r.id = le.round_id
  where (select private.is_admin())
  group by grouping sets ((r.event_id, le.round_id), (r.event_id));
$$;

create or replace function public.admin_log_usage()
returns table (event_id uuid, round_id uuid, fans bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select event_id, round_id, fans from private.log_usage();
$$;

-- ---------------------------------------------------------------------------
-- Grants

revoke execute on function public.set_event_log(uuid, jsonb, text) from public, anon;
grant execute on function public.set_event_log(uuid, jsonb, text) to authenticated;

revoke execute on function public.save_event(jsonb) from public, anon;
grant execute on function public.save_event(jsonb) to authenticated;

revoke execute on function private.log_usage() from public, anon;
grant execute on function private.log_usage() to authenticated;
revoke execute on function public.admin_log_usage() from public, anon;
grant execute on function public.admin_log_usage() to authenticated;
