-- Generic visual agent workflows.
-- This schema is intentionally independent from clinical session-note tables.

create table if not exists public.agent_workflows (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null default 'Untitled workflow',
  description text not null default '',
  nodes jsonb not null default '[]'::jsonb check (jsonb_typeof(nodes) = 'array'),
  edges jsonb not null default '[]'::jsonb check (jsonb_typeof(edges) = 'array'),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_workflow_versions (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.agent_workflows(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  version integer not null check (version > 0),
  name text not null,
  description text not null default '',
  nodes jsonb not null check (jsonb_typeof(nodes) = 'array'),
  edges jsonb not null check (jsonb_typeof(edges) = 'array'),
  created_at timestamptz not null default now(),
  unique (workflow_id, version)
);

create table if not exists public.agent_workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.agent_workflows(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'waiting_approval', 'completed', 'failed', 'cancelled')),
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  state jsonb not null default '{}'::jsonb,
  error text,
  retry_of uuid references public.agent_workflow_runs(id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_workflow_node_runs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_workflow_runs(id) on delete cascade,
  workflow_id uuid not null references public.agent_workflows(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  node_id text not null,
  node_type text not null,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'waiting_approval', 'completed', 'failed', 'cancelled', 'skipped')),
  attempt integer not null default 1 check (attempt > 0),
  input jsonb,
  output jsonb,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, node_id, attempt)
);

create index if not exists agent_workflows_owner_updated_idx
  on public.agent_workflows (owner_id, updated_at desc);
create index if not exists agent_workflow_versions_workflow_version_idx
  on public.agent_workflow_versions (workflow_id, version desc);
create index if not exists agent_workflow_runs_workflow_created_idx
  on public.agent_workflow_runs (workflow_id, created_at desc);
create index if not exists agent_workflow_runs_owner_status_idx
  on public.agent_workflow_runs (owner_id, status, created_at desc);
create index if not exists agent_workflow_node_runs_run_created_idx
  on public.agent_workflow_node_runs (run_id, created_at);

alter table public.agent_workflows enable row level security;
alter table public.agent_workflow_versions enable row level security;
alter table public.agent_workflow_runs enable row level security;
alter table public.agent_workflow_node_runs enable row level security;

drop policy if exists "Manage own agent workflows" on public.agent_workflows;
create policy "Manage own agent workflows"
  on public.agent_workflows
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Manage own agent workflow versions" on public.agent_workflow_versions;
create policy "Manage own agent workflow versions"
  on public.agent_workflow_versions
  for all
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.agent_workflows workflow
      where workflow.id = agent_workflow_versions.workflow_id
        and workflow.owner_id = auth.uid()
    )
  );

drop policy if exists "Manage own agent workflow runs" on public.agent_workflow_runs;
create policy "Manage own agent workflow runs"
  on public.agent_workflow_runs
  for all
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.agent_workflows workflow
      where workflow.id = agent_workflow_runs.workflow_id
        and workflow.owner_id = auth.uid()
    )
  );

drop policy if exists "Manage own agent workflow node runs" on public.agent_workflow_node_runs;
create policy "Manage own agent workflow node runs"
  on public.agent_workflow_node_runs
  for all
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.agent_workflow_runs run
      where run.id = agent_workflow_node_runs.run_id
        and run.workflow_id = agent_workflow_node_runs.workflow_id
        and run.owner_id = auth.uid()
    )
  );

create or replace function public.touch_agent_workflow_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists agent_workflows_touch_updated_at on public.agent_workflows;
create trigger agent_workflows_touch_updated_at
  before update on public.agent_workflows
  for each row execute function public.touch_agent_workflow_updated_at();

drop trigger if exists agent_workflow_runs_touch_updated_at on public.agent_workflow_runs;
create trigger agent_workflow_runs_touch_updated_at
  before update on public.agent_workflow_runs
  for each row execute function public.touch_agent_workflow_updated_at();

drop trigger if exists agent_workflow_node_runs_touch_updated_at on public.agent_workflow_node_runs;
create trigger agent_workflow_node_runs_touch_updated_at
  before update on public.agent_workflow_node_runs
  for each row execute function public.touch_agent_workflow_updated_at();

create or replace function public.snapshot_agent_workflow_version()
returns trigger
language plpgsql
security invoker
as $$
begin
  if old.name is distinct from new.name
    or old.description is distinct from new.description
    or old.nodes is distinct from new.nodes
    or old.edges is distinct from new.edges
    or old.status is distinct from new.status
  then
    new.version = old.version + 1;

    insert into public.agent_workflow_versions (
      workflow_id,
      owner_id,
      version,
      name,
      description,
      nodes,
      edges
    )
    values (
      old.id,
      old.owner_id,
      old.version,
      old.name,
      old.description,
      old.nodes,
      old.edges
    )
    on conflict (workflow_id, version) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists agent_workflows_snapshot_version on public.agent_workflows;
create trigger agent_workflows_snapshot_version
  before update on public.agent_workflows
  for each row execute function public.snapshot_agent_workflow_version();
