-- Rebalance transactions after edits/deletes and support negative behavior penalties

create or replace function public.rebalance_client_transactions(p_client_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_balance integer := 0;
  v_txn record;
begin
  for v_txn in
    select id, type, amount
    from public.transactions
    where client_id = p_client_id
    order by created_at asc, id asc
  loop
    if v_txn.type = 'credit' then
      v_balance := v_balance + v_txn.amount;
    else
      v_balance := greatest(0, v_balance - v_txn.amount);
    end if;

    update public.transactions
    set balance_after = v_balance
    where id = v_txn.id;
  end loop;

  update public.clients
  set balance = v_balance
  where id = p_client_id;
end;
$$;

create or replace function public.update_transaction_and_rebalance(
  p_transaction_id uuid,
  p_amount integer,
  p_note text default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_client_id uuid;
begin
  update public.transactions
  set amount = greatest(1, p_amount),
      note = p_note
  where id = p_transaction_id
  returning client_id into v_client_id;

  if v_client_id is null then
    raise exception 'Transaction not found';
  end if;

  perform public.rebalance_client_transactions(v_client_id);
end;
$$;

create or replace function public.delete_transaction_and_rebalance(
  p_transaction_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  v_client_id uuid;
begin
  select client_id into v_client_id
  from public.transactions
  where id = p_transaction_id;

  if v_client_id is null then
    raise exception 'Transaction not found';
  end if;

  delete from public.transactions where id = p_transaction_id;
  perform public.rebalance_client_transactions(v_client_id);
end;
$$;

create or replace function public.penalty_points(
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
  v_current_balance integer;
  v_new_balance integer;
  v_txn public.transactions;
begin
  select balance into v_current_balance
  from public.clients
  where id = p_client_id;

  update public.clients
  set balance = greatest(0, balance - greatest(1, p_amount))
  where id = p_client_id
  returning balance into v_new_balance;

  insert into public.transactions (client_id, type, amount, balance_after, behavior_id, note, created_by)
  values (p_client_id, 'debit', greatest(1, p_amount), v_new_balance, p_behavior_id, p_note, auth.uid())
  returning * into v_txn;

  return v_txn;
end;
$$;
