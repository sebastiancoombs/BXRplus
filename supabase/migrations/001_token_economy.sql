-- ============================================================
-- Token Economy Schema — ClassDojo-style credit/debit system
-- ============================================================

-- Roles enum for the app
create type app_role as enum ('bcba', 'rbt', 'parent');

-- ============================================================
-- Users (extends Supabase auth.users)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role app_role not null,
  avatar_url text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- ============================================================
-- Clients (the kids/individuals receiving ABA services)
-- ============================================================
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  date_of_birth date,
  avatar_url text,
  qr_code text unique not null default gen_random_uuid()::text,
  balance integer not null default 0,
  created_at timestamptz default now()
);

alter table public.clients enable row level security;

-- ============================================================
-- Many-to-many: who can access which client
-- ============================================================
create table public.client_staff (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  relationship app_role not null, -- bcba, rbt, or parent
  created_at timestamptz default now(),
  unique(client_id, user_id)
);

alter table public.client_staff enable row level security;

-- Users can see clients they're assigned to
create policy "Staff can see their assignments"
  on public.client_staff for select
  using (auth.uid() = user_id);

-- BCBAs can manage assignments
create policy "BCBAs can manage assignments"
  on public.client_staff for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'bcba'
    )
  );

-- Clients visible to assigned staff
create policy "Staff can see assigned clients"
  on public.clients for select
  using (
    exists (
      select 1 from public.client_staff
      where client_id = clients.id and user_id = auth.uid()
    )
  );

-- BCBAs can create/edit clients
create policy "BCBAs can manage clients"
  on public.clients for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'bcba'
    )
  );

-- ============================================================
-- Behaviors (what earns points — customizable per client)
-- ============================================================
create table public.behaviors (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  description text,
  point_value integer not null default 1,
  icon text default '⭐',
  is_active boolean default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

alter table public.behaviors enable row level security;

create policy "Staff can see client behaviors"
  on public.behaviors for select
  using (
    exists (
      select 1 from public.client_staff
      where client_id = behaviors.client_id and user_id = auth.uid()
    )
  );

create policy "Staff can manage client behaviors"
  on public.behaviors for all
  using (
    exists (
      select 1 from public.client_staff
      where client_id = behaviors.client_id and user_id = auth.uid()
    )
  );

-- ============================================================
-- Rewards (what points can buy — per client)
-- ============================================================
create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  description text,
  point_cost integer not null,
  icon text default '🎁',
  is_active boolean default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

alter table public.rewards enable row level security;

create policy "Staff can see client rewards"
  on public.rewards for select
  using (
    exists (
      select 1 from public.client_staff
      where client_id = rewards.client_id and user_id = auth.uid()
    )
  );

create policy "Staff can manage client rewards"
  on public.rewards for all
  using (
    exists (
      select 1 from public.client_staff
      where client_id = rewards.client_id and user_id = auth.uid()
    )
  );

-- ============================================================
-- Transactions (the ledger — every credit and debit)
-- ============================================================
create type transaction_type as enum ('credit', 'debit');

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  type transaction_type not null,
  amount integer not null,
  balance_after integer not null,
  -- credit: which behavior earned it
  behavior_id uuid references public.behaviors(id),
  -- debit: which reward was redeemed
  reward_id uuid references public.rewards(id),
  note text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz default now()
);

alter table public.transactions enable row level security;

create policy "Staff can see client transactions"
  on public.transactions for select
  using (
    exists (
      select 1 from public.client_staff
      where client_id = transactions.client_id and user_id = auth.uid()
    )
  );

create policy "Staff can create transactions"
  on public.transactions for insert
  with check (
    exists (
      select 1 from public.client_staff
      where client_id = transactions.client_id and user_id = auth.uid()
    )
  );

-- ============================================================
-- Function: Award points (credit)
-- ============================================================
create or replace function public.award_points(
  p_client_id uuid,
  p_behavior_id uuid,
  p_amount integer,
  p_note text default null
)
returns public.transactions
language plpgsql
security definer
as $$
declare
  v_new_balance integer;
  v_txn public.transactions;
begin
  -- Update client balance
  update public.clients
  set balance = balance + p_amount
  where id = p_client_id
  returning balance into v_new_balance;

  -- Insert transaction
  insert into public.transactions (client_id, type, amount, balance_after, behavior_id, note, created_by)
  values (p_client_id, 'credit', p_amount, v_new_balance, p_behavior_id, p_note, auth.uid())
  returning * into v_txn;

  return v_txn;
end;
$$;

-- ============================================================
-- Function: Redeem reward (debit)
-- ============================================================
create or replace function public.redeem_reward(
  p_client_id uuid,
  p_reward_id uuid,
  p_note text default null
)
returns public.transactions
language plpgsql
security definer
as $$
declare
  v_cost integer;
  v_current_balance integer;
  v_new_balance integer;
  v_txn public.transactions;
begin
  -- Get reward cost
  select point_cost into v_cost
  from public.rewards
  where id = p_reward_id and client_id = p_client_id;

  if v_cost is null then
    raise exception 'Reward not found for this client';
  end if;

  -- Check balance
  select balance into v_current_balance
  from public.clients
  where id = p_client_id;

  if v_current_balance < v_cost then
    raise exception 'Insufficient balance. Need % but have %', v_cost, v_current_balance;
  end if;

  -- Debit
  update public.clients
  set balance = balance - v_cost
  where id = p_client_id
  returning balance into v_new_balance;

  -- Insert transaction
  insert into public.transactions (client_id, type, amount, balance_after, reward_id, note, created_by)
  values (p_client_id, 'debit', v_cost, v_new_balance, p_reward_id, p_note, auth.uid())
  returning * into v_txn;

  return v_txn;
end;
$$;

-- ============================================================
-- Indexes
-- ============================================================
create index idx_client_staff_user on public.client_staff(user_id);
create index idx_client_staff_client on public.client_staff(client_id);
create index idx_transactions_client on public.transactions(client_id);
create index idx_transactions_created on public.transactions(created_at);
create index idx_behaviors_client on public.behaviors(client_id);
create index idx_rewards_client on public.rewards(client_id);
create index idx_clients_qr on public.clients(qr_code);
