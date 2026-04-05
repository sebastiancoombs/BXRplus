-- Break RLS recursion using a security definer function
-- This function bypasses RLS to check membership without triggering policy re-evaluation

create or replace function public.get_my_client_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select client_id from public.client_staff where user_id = auth.uid();
$$;

create or replace function public.get_my_bcba_client_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select client_id from public.client_staff where user_id = auth.uid() and relationship = 'bcba';
$$;

-- Drop all client_staff policies and rebuild with functions
drop policy if exists "Users see own assignments" on public.client_staff;
drop policy if exists "BCBAs see client team" on public.client_staff;
drop policy if exists "Users can self-assign" on public.client_staff;
drop policy if exists "BCBAs can add team members" on public.client_staff;
drop policy if exists "BCBAs can remove team members" on public.client_staff;

create policy "See assignments for my clients"
  on public.client_staff for select
  using (client_id in (select public.get_my_client_ids()));

create policy "Self-assign"
  on public.client_staff for insert
  with check (auth.uid() = user_id);

create policy "BCBAs add members"
  on public.client_staff for insert
  with check (client_id in (select public.get_my_bcba_client_ids()));

create policy "BCBAs remove members"
  on public.client_staff for delete
  using (client_id in (select public.get_my_bcba_client_ids()));

-- Fix clients policies
drop policy if exists "Staff can see assigned clients" on public.clients;
drop policy if exists "Authenticated users can create clients" on public.clients;
drop policy if exists "Staff can update assigned clients" on public.clients;

create policy "See my clients"
  on public.clients for select
  using (id in (select public.get_my_client_ids()));

create policy "Anyone can create clients"
  on public.clients for insert
  with check (auth.uid() is not null);

create policy "Staff can update clients"
  on public.clients for update
  using (id in (select public.get_my_client_ids()));

-- Fix behaviors policies
drop policy if exists "Staff can see client behaviors" on public.behaviors;
drop policy if exists "Staff can manage client behaviors" on public.behaviors;

create policy "See client behaviors"
  on public.behaviors for select
  using (client_id in (select public.get_my_client_ids()));

create policy "Manage client behaviors"
  on public.behaviors for all
  using (client_id in (select public.get_my_client_ids()));

-- Fix rewards policies
drop policy if exists "Staff can see client rewards" on public.rewards;
drop policy if exists "Staff can manage client rewards" on public.rewards;

create policy "See client rewards"
  on public.rewards for select
  using (client_id in (select public.get_my_client_ids()));

create policy "Manage client rewards"
  on public.rewards for all
  using (client_id in (select public.get_my_client_ids()));

-- Fix transactions policies
drop policy if exists "Staff can see client transactions" on public.transactions;
drop policy if exists "Staff can create transactions" on public.transactions;

create policy "See client transactions"
  on public.transactions for select
  using (client_id in (select public.get_my_client_ids()));

create policy "Create transactions"
  on public.transactions for insert
  with check (client_id in (select public.get_my_client_ids()));
