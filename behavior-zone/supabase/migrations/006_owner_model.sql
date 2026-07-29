-- ============================================================
-- Add owner_id to clients — simplify the whole model
-- ============================================================

-- Add owner column
alter table public.clients add column owner_id uuid references auth.users(id);

-- Set existing clients' owner to the first staff member (best guess)
update public.clients c
set owner_id = (
  select user_id from public.client_staff
  where client_id = c.id
  order by created_at asc
  limit 1
)
where owner_id is null;

-- Make it not null going forward
-- (skip if there are orphaned clients with no staff)
-- alter table public.clients alter column owner_id set not null;

-- Transfer ownership function
create or replace function public.transfer_ownership(
  p_client_id uuid,
  p_new_owner_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  -- Only current owner can transfer
  if (select owner_id from public.clients where id = p_client_id) != auth.uid() then
    raise exception 'Only the owner can transfer ownership';
  end if;
  
  update public.clients set owner_id = p_new_owner_id where id = p_client_id;
end;
$$;

-- ============================================================
-- Rebuild ALL RLS policies — clean slate, no recursion
-- ============================================================

-- Drop everything on clients
drop policy if exists "See my clients" on public.clients;
drop policy if exists "Anyone can create clients" on public.clients;
drop policy if exists "Staff can update clients" on public.clients;
drop policy if exists "BCBAs can manage clients" on public.clients;
drop policy if exists "Authenticated users can create clients" on public.clients;
drop policy if exists "Staff can update assigned clients" on public.clients;
drop policy if exists "Staff can see assigned clients" on public.clients;

-- Clients: see if you own it OR you're shared on it
create policy "See clients"
  on public.clients for select
  using (
    owner_id = auth.uid()
    or id in (select public.get_my_client_ids())
  );

create policy "Create clients"
  on public.clients for insert
  with check (auth.uid() is not null);

create policy "Update own or shared clients"
  on public.clients for update
  using (
    owner_id = auth.uid()
    or id in (select public.get_my_client_ids())
  );

-- Drop everything on client_staff
drop policy if exists "See assignments for my clients" on public.client_staff;
drop policy if exists "Self-assign" on public.client_staff;
drop policy if exists "BCBAs add members" on public.client_staff;
drop policy if exists "BCBAs remove members" on public.client_staff;

-- client_staff: owners can do everything, others can see their own
create policy "See team"
  on public.client_staff for select
  using (
    user_id = auth.uid()
    or client_id in (select id from public.clients where owner_id = auth.uid())
  );

create policy "Owner or self can insert"
  on public.client_staff for insert
  with check (
    auth.uid() = user_id
    or client_id in (select id from public.clients where owner_id = auth.uid())
  );

create policy "Owner can delete"
  on public.client_staff for delete
  using (
    client_id in (select id from public.clients where owner_id = auth.uid())
  );

-- Behaviors: owner or shared staff
drop policy if exists "See client behaviors" on public.behaviors;
drop policy if exists "Manage client behaviors" on public.behaviors;

create policy "See behaviors"
  on public.behaviors for select
  using (
    client_id in (select id from public.clients where owner_id = auth.uid())
    or client_id in (select public.get_my_client_ids())
  );

create policy "Manage behaviors"
  on public.behaviors for all
  using (
    client_id in (select id from public.clients where owner_id = auth.uid())
    or client_id in (select public.get_my_client_ids())
  );

-- Rewards: same pattern
drop policy if exists "See client rewards" on public.rewards;
drop policy if exists "Manage client rewards" on public.rewards;

create policy "See rewards"
  on public.rewards for select
  using (
    client_id in (select id from public.clients where owner_id = auth.uid())
    or client_id in (select public.get_my_client_ids())
  );

create policy "Manage rewards"
  on public.rewards for all
  using (
    client_id in (select id from public.clients where owner_id = auth.uid())
    or client_id in (select public.get_my_client_ids())
  );

-- Transactions: same pattern
drop policy if exists "See client transactions" on public.transactions;
drop policy if exists "Create transactions" on public.transactions;

create policy "See transactions"
  on public.transactions for select
  using (
    client_id in (select id from public.clients where owner_id = auth.uid())
    or client_id in (select public.get_my_client_ids())
  );

create policy "Create transactions"
  on public.transactions for insert
  with check (
    client_id in (select id from public.clients where owner_id = auth.uid())
    or client_id in (select public.get_my_client_ids())
  );
