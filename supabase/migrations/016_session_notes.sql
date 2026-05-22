-- Session notes + rich-text reports for BCBA documentation

create table if not exists public.session_note_categories (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  description text,
  sort_order integer not null default 0,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.session_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  category_id uuid references public.session_note_categories(id) on delete set null,
  service_date date not null default current_date,
  title text not null default 'Session note',
  content text not null default '',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.session_note_reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  service_date date not null default current_date,
  title text not null default 'Session note report',
  content_html text not null default '',
  generated_from jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_session_note_categories_client on public.session_note_categories(client_id, sort_order);
create index if not exists idx_session_notes_client_date on public.session_notes(client_id, service_date desc, created_at desc);
create index if not exists idx_session_note_reports_client_date on public.session_note_reports(client_id, service_date desc, updated_at desc);

alter table public.session_note_categories enable row level security;
alter table public.session_notes enable row level security;
alter table public.session_note_reports enable row level security;

create policy "See session note categories"
  on public.session_note_categories for select
  using (
    client_id in (select id from public.clients where owner_id = auth.uid())
    or client_id in (select public.get_my_client_ids())
  );

create policy "Manage session note categories"
  on public.session_note_categories for all
  using (
    client_id in (select id from public.clients where owner_id = auth.uid())
    or client_id in (select public.get_my_client_ids())
  )
  with check (
    client_id in (select id from public.clients where owner_id = auth.uid())
    or client_id in (select public.get_my_client_ids())
  );

create policy "See session notes"
  on public.session_notes for select
  using (
    client_id in (select id from public.clients where owner_id = auth.uid())
    or client_id in (select public.get_my_client_ids())
  );

create policy "Manage session notes"
  on public.session_notes for all
  using (
    client_id in (select id from public.clients where owner_id = auth.uid())
    or client_id in (select public.get_my_client_ids())
  )
  with check (
    client_id in (select id from public.clients where owner_id = auth.uid())
    or client_id in (select public.get_my_client_ids())
  );

create policy "See session note reports"
  on public.session_note_reports for select
  using (
    client_id in (select id from public.clients where owner_id = auth.uid())
    or client_id in (select public.get_my_client_ids())
  );

create policy "Manage session note reports"
  on public.session_note_reports for all
  using (
    client_id in (select id from public.clients where owner_id = auth.uid())
    or client_id in (select public.get_my_client_ids())
  )
  with check (
    client_id in (select id from public.clients where owner_id = auth.uid())
    or client_id in (select public.get_my_client_ids())
  );
