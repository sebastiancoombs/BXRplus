-- ============================================================
-- Remove global role from profiles — role lives per-relationship
-- ============================================================

-- Drop the role column from profiles
alter table public.profiles alter column role drop not null;
alter table public.profiles alter column role drop default;

-- Allow any authenticated user to insert their own profile (already exists)
-- Allow any authenticated user to read any profile (for team member lookups)
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read profiles"
  on public.profiles for select
  using (true);

-- Allow any authenticated user to create clients
drop policy if exists "BCBAs can manage clients" on public.clients;
create policy "Authenticated users can create clients"
  on public.clients for insert
  with check (auth.uid() is not null);

create policy "Staff can update assigned clients"
  on public.clients for update
  using (
    exists (
      select 1 from public.client_staff
      where client_id = clients.id and user_id = auth.uid()
    )
  );

-- Allow BCBAs (per-client) to manage staff assignments
drop policy if exists "BCBAs can manage assignments" on public.client_staff;
create policy "Client BCBAs can manage assignments"
  on public.client_staff for all
  using (
    exists (
      select 1 from public.client_staff cs
      where cs.client_id = client_staff.client_id
        and cs.user_id = auth.uid()
        and cs.relationship = 'bcba'
    )
  );

-- Also allow users to insert themselves (for self-assignment on client creation)
create policy "Users can self-assign to clients they create"
  on public.client_staff for insert
  with check (auth.uid() = user_id);
