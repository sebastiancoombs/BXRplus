create table if not exists public.session_note_cards (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.session_notes(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  body text not null,
  zone text not null default 'Quick notes',
  sort_order integer not null default 0,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists session_note_cards_note_zone_idx on public.session_note_cards (note_id, zone, sort_order, created_at);

alter table public.session_note_cards enable row level security;

drop policy if exists "See note cards" on public.session_note_cards;
drop policy if exists "Create note cards" on public.session_note_cards;
drop policy if exists "Update note cards" on public.session_note_cards;
drop policy if exists "Delete note cards" on public.session_note_cards;

create policy "See note cards" on public.session_note_cards for select using (
  client_id in (select id from public.clients where owner_id = auth.uid())
  or client_id in (select public.get_my_client_ids())
);
create policy "Create note cards" on public.session_note_cards for insert with check (
  created_by = auth.uid()
  and (
    client_id in (select id from public.clients where owner_id = auth.uid())
    or client_id in (select public.get_my_client_ids())
  )
);
create policy "Update note cards" on public.session_note_cards for update using (
  client_id in (select id from public.clients where owner_id = auth.uid())
  or client_id in (select public.get_my_client_ids())
) with check (
  client_id in (select id from public.clients where owner_id = auth.uid())
  or client_id in (select public.get_my_client_ids())
);
create policy "Delete note cards" on public.session_note_cards for delete using (
  client_id in (select id from public.clients where owner_id = auth.uid())
  or client_id in (select public.get_my_client_ids())
);

create or replace function public.touch_session_note_cards_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists session_note_cards_touch_updated_at on public.session_note_cards;
create trigger session_note_cards_touch_updated_at before update on public.session_note_cards for each row execute function public.touch_session_note_cards_updated_at();

insert into public.session_note_cards (note_id, client_id, body, zone, sort_order, created_by)
select n.id, n.client_id, trim(raw.card), 'Quick notes', raw.ordinality::int, n.created_by
from public.session_notes n
cross join lateral unnest(string_to_array(coalesce(n.quick_notes, ''), E'
')) with ordinality as raw(card, ordinality)
where trim(raw.card) <> ''
  and not exists (select 1 from public.session_note_cards c where c.note_id = n.id);
