-- Restore the report store expected by the session-notes UI and workflow data nodes.
-- The earlier session-note migration shares a duplicate version number and this table
-- was never created in the linked project.

create table if not exists public.session_note_reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  service_date date not null default current_date,
  title text not null default 'Session note report',
  content_html text not null default '',
  generated_from jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists session_note_reports_client_date_idx
  on public.session_note_reports (client_id, service_date desc, updated_at desc);

alter table public.session_note_reports enable row level security;

drop policy if exists "See session note reports" on public.session_note_reports;
drop policy if exists "Create session note reports" on public.session_note_reports;
drop policy if exists "Update session note reports" on public.session_note_reports;
drop policy if exists "Delete session note reports" on public.session_note_reports;

create policy "See session note reports"
  on public.session_note_reports for select
  using (
    client_id in (select id from public.clients where owner_id = auth.uid())
    or client_id in (select public.get_my_client_ids())
  );

create policy "Create session note reports"
  on public.session_note_reports for insert
  with check (
    created_by = auth.uid()
    and (
      client_id in (select id from public.clients where owner_id = auth.uid())
      or client_id in (select public.get_my_client_ids())
    )
  );

create policy "Update session note reports"
  on public.session_note_reports for update
  using (
    client_id in (select id from public.clients where owner_id = auth.uid())
    or client_id in (select public.get_my_client_ids())
  )
  with check (
    client_id in (select id from public.clients where owner_id = auth.uid())
    or client_id in (select public.get_my_client_ids())
  );

create policy "Delete session note reports"
  on public.session_note_reports for delete
  using (
    client_id in (select id from public.clients where owner_id = auth.uid())
    or client_id in (select public.get_my_client_ids())
  );

create or replace function public.touch_session_note_report_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists session_note_reports_touch_updated_at
  on public.session_note_reports;
create trigger session_note_reports_touch_updated_at
  before update on public.session_note_reports
  for each row execute function public.touch_session_note_report_updated_at();
