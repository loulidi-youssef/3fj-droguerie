-- Idempotency guard for order creation.
-- Prevent duplicate order inserts and duplicate stock decrements on retries.

create table if not exists public.order_idempotency_keys (
  idempotency_key text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  request_fingerprint text null,
  order_id uuid null references public.orders(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_idempotency_keys_key_not_blank check (btrim(idempotency_key) <> '')
);

drop trigger if exists trg_order_idempotency_keys_updated_at on public.order_idempotency_keys;
create trigger trg_order_idempotency_keys_updated_at
before update on public.order_idempotency_keys
for each row
execute function public.set_updated_at();

create index if not exists idx_order_idempotency_keys_user_created_at
on public.order_idempotency_keys(user_id, created_at desc);

create index if not exists idx_order_idempotency_keys_order_id
on public.order_idempotency_keys(order_id);

drop function if exists public.create_order_with_items_atomic(
  text,
  text,
  text,
  text,
  integer,
  integer,
  integer,
  uuid,
  jsonb,
  text
);

create or replace function public.create_order_with_items_atomic(
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_customer_location text,
  p_subtotal integer,
  p_delivery_fee integer,
  p_total integer,
  p_user_id uuid,
  p_items jsonb,
  p_fulfillment_method text,
  p_idempotency_key text,
  p_request_fingerprint text
)
returns uuid
language plpgsql
as $$
declare
  v_order_id uuid;
  v_item record;
  v_rows integer;
  v_fulfillment_method text;
  v_idempotency_key text;
  v_request_fingerprint text;
  v_existing_order_id uuid;
  v_existing_user_id uuid;
  v_existing_request_fingerprint text;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'ORDER_ITEMS_EMPTY';
  end if;

  if p_subtotal < 0 or p_delivery_fee < 0 or p_total < 0 or p_total <> (p_subtotal + p_delivery_fee) then
    raise exception 'INVALID_ORDER_TOTALS';
  end if;

  if p_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  v_fulfillment_method := coalesce(nullif(btrim(p_fulfillment_method), ''), 'delivery');
  if v_fulfillment_method not in ('delivery', 'pickup') then
    raise exception 'INVALID_FULFILLMENT_METHOD';
  end if;

  v_idempotency_key := nullif(btrim(p_idempotency_key), '');
  if v_idempotency_key is null then
    raise exception 'IDEMPOTENCY_KEY_REQUIRED';
  end if;

  v_request_fingerprint := nullif(btrim(p_request_fingerprint), '');

  insert into public.order_idempotency_keys (
    idempotency_key,
    user_id,
    request_fingerprint
  )
  values (
    v_idempotency_key,
    p_user_id,
    v_request_fingerprint
  )
  on conflict (idempotency_key) do nothing;

  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    select
      existing.order_id,
      existing.user_id,
      existing.request_fingerprint
    into
      v_existing_order_id,
      v_existing_user_id,
      v_existing_request_fingerprint
    from public.order_idempotency_keys as existing
    where existing.idempotency_key = v_idempotency_key
    for update;

    if not found then
      raise exception 'IDEMPOTENCY_KEY_LOOKUP_FAILED';
    end if;

    if v_existing_user_id is distinct from p_user_id then
      raise exception 'IDEMPOTENCY_KEY_OWNERSHIP_MISMATCH';
    end if;

    if v_request_fingerprint is not null
      and v_existing_request_fingerprint is not null
      and v_existing_request_fingerprint <> v_request_fingerprint then
      raise exception 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD';
    end if;

    if v_existing_order_id is not null then
      return v_existing_order_id;
    end if;

    raise exception 'IDEMPOTENCY_KEY_IN_PROGRESS';
  end if;

  for v_item in
    select *
    from jsonb_to_recordset(p_items) as item(
      product_id text,
      variant_id text,
      selected_color text,
      selected_size text,
      product_name text,
      quantity integer,
      unit_price integer,
      line_total integer
    )
  loop
    if v_item.product_id is null or btrim(v_item.product_id) = '' then
      raise exception 'INVALID_PRODUCT_ID';
    end if;

    if v_item.product_name is null or btrim(v_item.product_name) = '' then
      raise exception 'INVALID_PRODUCT_NAME';
    end if;

    if v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'INVALID_ITEM_QUANTITY';
    end if;

    if v_item.unit_price is null or v_item.unit_price < 0 then
      raise exception 'INVALID_UNIT_PRICE';
    end if;

    if v_item.line_total is null or v_item.line_total <> (v_item.quantity * v_item.unit_price) then
      raise exception 'INVALID_LINE_TOTAL';
    end if;

    if v_item.variant_id is null or btrim(v_item.variant_id) = '' then
      update public.products
      set stock = stock - v_item.quantity
      where id = v_item.product_id
        and stock >= v_item.quantity;

      get diagnostics v_rows = row_count;
      if v_rows <> 1 then
        raise exception 'INSUFFICIENT_STOCK';
      end if;
    else
      update public.product_variants
      set stock = stock - v_item.quantity
      where id = v_item.variant_id::uuid
        and product_id = v_item.product_id
        and is_active = true
        and stock >= v_item.quantity;

      get diagnostics v_rows = row_count;
      if v_rows <> 1 then
        raise exception 'INSUFFICIENT_VARIANT_STOCK';
      end if;
    end if;
  end loop;

  insert into public.orders (
    user_id,
    fulfillment_method,
    customer_name,
    customer_phone,
    customer_address,
    customer_location,
    subtotal,
    delivery_fee,
    total
  )
  values (
    p_user_id,
    v_fulfillment_method,
    p_customer_name,
    p_customer_phone,
    p_customer_address,
    p_customer_location,
    p_subtotal,
    p_delivery_fee,
    p_total
  )
  returning id into v_order_id;

  insert into public.order_items (
    order_id,
    product_id,
    variant_id,
    selected_color,
    selected_size,
    product_name,
    quantity,
    unit_price,
    line_total
  )
  select
    v_order_id,
    item.product_id,
    item.variant_id::uuid,
    item.selected_color,
    item.selected_size,
    item.product_name,
    item.quantity,
    item.unit_price,
    item.line_total
  from jsonb_to_recordset(p_items) as item(
    product_id text,
    variant_id text,
    selected_color text,
    selected_size text,
    product_name text,
    quantity integer,
    unit_price integer,
    line_total integer
  );

  update public.order_idempotency_keys
  set
    order_id = v_order_id,
    request_fingerprint = coalesce(v_request_fingerprint, request_fingerprint),
    updated_at = now()
  where idempotency_key = v_idempotency_key;

  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'IDEMPOTENCY_KEY_UPDATE_FAILED';
  end if;

  return v_order_id;
end;
$$;
