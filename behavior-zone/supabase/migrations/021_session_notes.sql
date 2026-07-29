-- Global clinical session notes with AI-draft support

create table if not exists public.session_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  service_date date not null default current_date,
  title text not null default 'Session note',
  quick_notes text not null default '',
  insurance_note text not null default '',
  status text not null default 'draft' check (status in ('draft', 'ready', 'submitted')),
  created_by uuid not null references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists session_notes_client_date_idx
  on public.session_notes (client_id, service_date desc, created_at desc);

alter table public.session_notes enable row level security;

drop policy if exists "See session notes" on public.session_notes;
drop policy if exists "Create session notes" on public.session_notes;
drop policy if exists "Update session notes" on public.session_notes;
drop policy if exists "Delete session notes" on public.session_notes;

create policy "See session notes"
  on public.session_notes for select
  using (
    client_id in (select id from public.clients where owner_id = auth.uid())
    or client_id in (select public.get_my_client_ids())
  );

create policy "Create session notes"
  on public.session_notes for insert
  with check (
    created_by = auth.uid()
    and (
      client_id in (select id from public.clients where owner_id = auth.uid())
      or client_id in (select public.get_my_client_ids())
    )
  );

create policy "Update session notes"
  on public.session_notes for update
  using (
    client_id in (select id from public.clients where owner_id = auth.uid())
    or client_id in (select public.get_my_client_ids())
  )
  with check (
    client_id in (select id from public.clients where owner_id = auth.uid())
    or client_id in (select public.get_my_client_ids())
  );

create policy "Delete session notes"
  on public.session_notes for delete
  using (
    client_id in (select id from public.clients where owner_id = auth.uid())
    or client_id in (select public.get_my_client_ids())
  );

create or replace function public.touch_session_note_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists session_notes_touch_updated_at on public.session_notes;
create trigger session_notes_touch_updated_at
  before update on public.session_notes
  for each row execute function public.touch_session_note_updated_at();
