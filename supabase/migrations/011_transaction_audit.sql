-- Add lightweight transaction audit clarity
alter table public.transactions add column if not exists edited_at timestamptz;
alter table public.transactions add column if not exists original_amount integer;
alter table public.transactions add column if not exists original_note text;

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
  set original_amount = coalesce(original_amount, amount),
      original_note = coalesce(original_note, note),
      amount = greatest(1, p_amount),
      note = p_note,
      edited_at = now()
  where id = p_transaction_id
  returning client_id into v_client_id;

  if v_client_id is null then
    raise exception 'Transaction not found';
  end if;

  perform public.rebalance_client_transactions(v_client_id);
end;
$$;
