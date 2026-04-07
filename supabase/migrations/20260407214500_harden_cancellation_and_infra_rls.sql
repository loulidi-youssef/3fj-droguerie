-- Priority-1 hardening:
-- 1) transactional cancellation with stock restoration
-- 2) strict RLS on infra tables used for idempotency and rate limiting

create or replace function public.cancel_order_and_restore_stock_atomic(
  p_order_id uuid,
  p_user_id uuid default null,
  p_cancellation_boundary timestamptz default null,
  p_allowed_statuses text[] default array['new']
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_item record;
  v_rows integer;
begin
  if p_order_id is null then
    raise exception 'ORDER_ID_REQUIRED';
  end if;

  if p_allowed_statuses is null or cardinality(p_allowed_statuses) = 0 then
    raise exception 'ALLOWED_STATUSES_REQUIRED';
  end if;

  select
    o.id,
    o.user_id,
    o.status,
    o.created_at
  into v_order
  from public.orders as o
  where o.id = p_order_id
  for update;

  if not found then
    return false;
  end if;

  if p_user_id is not null and v_order.user_id is distinct from p_user_id then
    return false;
  end if;

  if p_cancellation_boundary is not null and v_order.created_at < p_cancellation_boundary then
    return false;
  end if;

  if not (v_order.status = any(p_allowed_statuses)) then
    return false;
  end if;

  for v_item in
    select
      oi.product_id,
      oi.variant_id,
      oi.quantity
    from public.order_items as oi
    where oi.order_id = v_order.id
  loop
    if v_item.variant_id is null then
      update public.products
      set stock = stock + v_item.quantity
      where id = v_item.product_id;

      get diagnostics v_rows = row_count;
      if v_rows <> 1 then
        raise exception 'PRODUCT_STOCK_RESTORE_FAILED';
      end if;
    else
      update public.product_variants
      set stock = stock + v_item.quantity
      where id = v_item.variant_id
        and product_id = v_item.product_id;

      get diagnostics v_rows = row_count;
      if v_rows <> 1 then
        raise exception 'VARIANT_STOCK_RESTORE_FAILED';
      end if;
    end if;
  end loop;

  update public.orders
  set
    status = 'cancelled',
    updated_at = now()
  where id = v_order.id
    and status = any(p_allowed_statuses);

  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'ORDER_CANCEL_UPDATE_FAILED';
  end if;

  return true;
end;
$$;

revoke all on function public.cancel_order_and_restore_stock_atomic(uuid, uuid, timestamptz, text[]) from public;
grant execute on function public.cancel_order_and_restore_stock_atomic(uuid, uuid, timestamptz, text[]) to service_role;

alter table if exists public.order_idempotency_keys enable row level security;
alter table if exists public.request_rate_limits enable row level security;

revoke all on table public.order_idempotency_keys from public, anon, authenticated;
revoke all on table public.request_rate_limits from public, anon, authenticated;
