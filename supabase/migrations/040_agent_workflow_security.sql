-- Workflow live events, audit trail, limits, cleanup, and Vault-backed credentials.

create extension if not exists supabase_vault with schema vault;
create extension if not exists pg_cron with schema pg_catalog;

create table if not exists public.agent_workflow_secrets (
  owner_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('openai', 'anthropic', 'groq', 'firecrawl', 'mcp', 'e2b')),
  secret_id uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, provider)
);

create table if not exists public.agent_workflow_audit_events (
  id bigint generated always as identity primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  workflow_id uuid references public.agent_workflows(id) on delete cascade,
  run_id uuid references public.agent_workflow_runs(id) on delete cascade,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists agent_workflow_audit_owner_created_idx
  on public.agent_workflow_audit_events (owner_id, created_at desc);
create index if not exists agent_workflow_audit_run_created_idx
  on public.agent_workflow_audit_events (run_id, created_at);

alter table public.agent_workflow_secrets enable row level security;
alter table public.agent_workflow_audit_events enable row level security;

drop policy if exists "Read own workflow secret metadata" on public.agent_workflow_secrets;
create policy "Read own workflow secret metadata"
  on public.agent_workflow_secrets for select
  using (owner_id = auth.uid());

drop policy if exists "Read own workflow audit events" on public.agent_workflow_audit_events;
create policy "Read own workflow audit events"
  on public.agent_workflow_audit_events for select
  using (owner_id = auth.uid());

drop policy if exists "Write own workflow audit events" on public.agent_workflow_audit_events;
create policy "Write own workflow audit events"
  on public.agent_workflow_audit_events for insert
  with check (owner_id = auth.uid());

create or replace function public.save_agent_workflow_secret(
  provider_name text,
  secret_value text
)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  current_owner uuid := auth.uid();
  existing_secret uuid;
  stored_secret uuid;
begin
  if current_owner is null then raise exception 'Authentication required'; end if;
  if provider_name not in ('openai', 'anthropic', 'groq', 'firecrawl', 'mcp', 'e2b') then
    raise exception 'Unsupported provider';
  end if;
  if length(trim(secret_value)) < 8 or length(secret_value) > 20000 then
    raise exception 'Invalid secret';
  end if;

  select secret_id into existing_secret
  from public.agent_workflow_secrets
  where owner_id = current_owner and provider = provider_name;

  if existing_secret is null then
    select vault.create_secret(
      secret_value,
      'agent-workflow-' || current_owner::text || '-' || provider_name,
      'BXR+ user-owned workflow provider credential'
    ) into stored_secret;
  else
    perform vault.update_secret(existing_secret, secret_value);
    stored_secret := existing_secret;
  end if;

  insert into public.agent_workflow_secrets (owner_id, provider, secret_id)
  values (current_owner, provider_name, stored_secret)
  on conflict (owner_id, provider) do update
    set secret_id = excluded.secret_id, updated_at = now();

  insert into public.agent_workflow_audit_events (owner_id, event_type, details)
  values (current_owner, 'credential.saved', jsonb_build_object('provider', provider_name));
end;
$$;

create or replace function public.delete_agent_workflow_secret(provider_name text)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  current_owner uuid := auth.uid();
  existing_secret uuid;
begin
  if current_owner is null then raise exception 'Authentication required'; end if;
  delete from public.agent_workflow_secrets
  where owner_id = current_owner and provider = provider_name
  returning secret_id into existing_secret;
  if existing_secret is not null then
    delete from vault.secrets where id = existing_secret;
  end if;
  insert into public.agent_workflow_audit_events (owner_id, event_type, details)
  values (current_owner, 'credential.deleted', jsonb_build_object('provider', provider_name));
end;
$$;

create or replace function public.get_agent_workflow_secrets()
returns table(provider text, secret text)
language sql
security definer
set search_path = public, vault
as $$
  select metadata.provider, decrypted.decrypted_secret
  from public.agent_workflow_secrets metadata
  join vault.decrypted_secrets decrypted on decrypted.id = metadata.secret_id
  where metadata.owner_id = auth.uid();
$$;

create or replace function public.claim_agent_workflow_run_slot(workflow uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_owner uuid := auth.uid();
  recent_runs integer;
  active_runs integer;
begin
  if current_owner is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.agent_workflows
    where id = workflow and owner_id = current_owner
  ) then raise exception 'Workflow not found'; end if;

  select count(*) into recent_runs from public.agent_workflow_runs
  where owner_id = current_owner and created_at > now() - interval '1 minute';
  select count(*) into active_runs from public.agent_workflow_runs
  where owner_id = current_owner and status in ('queued', 'running', 'waiting_approval');

  if recent_runs >= 10 then raise exception 'Workflow run rate limit exceeded'; end if;
  if active_runs >= 3 then raise exception 'Too many active workflow runs'; end if;
end;
$$;

create or replace function public.cleanup_agent_workflow_history()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.agent_workflow_audit_events
  where created_at < now() - interval '180 days';
  delete from public.agent_workflow_runs
  where created_at < now() - interval '90 days'
    and status in ('completed', 'failed', 'cancelled');
end;
$$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'agent-workflow-history-cleanup') then
    perform cron.unschedule('agent-workflow-history-cleanup');
  end if;
  perform cron.schedule(
    'agent-workflow-history-cleanup',
    '17 3 * * *',
    'select public.cleanup_agent_workflow_history()'
  );
end;
$$;

revoke all on function public.save_agent_workflow_secret(text, text) from public;
revoke all on function public.delete_agent_workflow_secret(text) from public;
revoke all on function public.get_agent_workflow_secrets() from public;
revoke all on function public.claim_agent_workflow_run_slot(uuid) from public;
revoke all on function public.cleanup_agent_workflow_history() from public, authenticated;
grant execute on function public.save_agent_workflow_secret(text, text) to authenticated;
grant execute on function public.delete_agent_workflow_secret(text) to authenticated;
grant execute on function public.get_agent_workflow_secrets() to authenticated;
grant execute on function public.claim_agent_workflow_run_slot(uuid) to authenticated;
grant execute on function public.cleanup_agent_workflow_history() to service_role;
