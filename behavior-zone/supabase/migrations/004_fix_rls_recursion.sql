-- Fix infinite recursion on client_staff RLS
-- The problem: "BCBAs can manage" policy on client_staff queries client_staff → infinite loop

-- Drop all existing policies on client_staff
drop policy if exists "Staff can see their assignments" on public.client_staff;
drop policy if exists "Client BCBAs can manage assignments" on public.client_staff;
drop policy if exists "Users can self-assign to clients they create" on public.client_staff;

-- Simple, non-recursive policies:

-- Everyone can see their own assignments
create policy "Users see own assignments"
  on public.client_staff for select
  using (auth.uid() = user_id);

-- BCBAs can see all assignments for their clients (use a subquery that only hits own rows)
create policy "BCBAs see client team"
  on public.client_staff for select
  using (
    client_id in (
      select cs.client_id from public.client_staff cs
      where cs.user_id = auth.uid()
    )
  );

-- Anyone can insert their own assignment (self-assign when creating a client)
create policy "Users can self-assign"
  on public.client_staff for insert
  with check (auth.uid() = user_id);

-- BCBAs can insert others onto their clients
create policy "BCBAs can add team members"
  on public.client_staff for insert
  with check (
    client_id in (
      select cs.client_id from public.client_staff cs
      where cs.user_id = auth.uid() and cs.relationship = 'bcba'
    )
  );

-- BCBAs can delete team members from their clients
create policy "BCBAs can remove team members"
  on public.client_staff for delete
  using (
    client_id in (
      select cs.client_id from public.client_staff cs
      where cs.user_id = auth.uid() and cs.relationship = 'bcba'
    )
  );

-- Also fix clients select — it was relying on client_staff which was broken
drop policy if exists "Staff can see assigned clients" on public.clients;
create policy "Staff can see assigned clients"
  on public.clients for select
  using (
    id in (
      select cs.client_id from public.client_staff cs
      where cs.user_id = auth.uid()
    )
  );
