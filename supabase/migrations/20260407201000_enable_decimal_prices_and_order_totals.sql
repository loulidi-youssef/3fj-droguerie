-- Decimal prices support:
-- - store catalog and order monetary fields with 2 decimals
-- - keep create_order_with_items_atomic aligned with decimal totals

alter table if exists public.products
alter column price type numeric(12, 2) using round(price::numeric, 2);

alter table if exists public.product_variants
alter column price type numeric(12, 2) using round(price::numeric, 2),
alter column previous_price type numeric(12, 2) using
  case
    when previous_price is null then null
    else round(previous_price::numeric, 2)
  end;

alter table if exists public.offers
alter column discounted_price type numeric(12, 2) using
  case
    when discounted_price is null then null
    else round(discounted_price::numeric, 2)
  end;

alter table if exists public.orders
alter column subtotal type numeric(12, 2) using round(subtotal::numeric, 2),
alter column delivery_fee type numeric(12, 2) using round(delivery_fee::numeric, 2),
alter column total type numeric(12, 2) using round(total::numeric, 2);

alter table if exists public.order_items
alter column unit_price type numeric(12, 2) using round(unit_price::numeric, 2),
alter column line_total type numeric(12, 2) using round(line_total::numeric, 2);

alter table if exists public.products
drop constraint if exists products_price_check;
alter table if exists public.products
add constraint products_price_check
check (price > 0);

alter table if exists public.product_variants
drop constraint if exists product_variants_price_check;
alter table if exists public.product_variants
add constraint product_variants_price_check
check (price > 0);

alter table if exists public.product_variants
drop constraint if exists product_variants_previous_price_check;
alter table if exists public.product_variants
add constraint product_variants_previous_price_check
check (previous_price is null or previous_price > price);

alter table if exists public.offers
drop constraint if exists offers_discounted_price_check;
alter table if exists public.offers
add constraint offers_discounted_price_check
check (discounted_price is null or discounted_price > 0);

alter table if exists public.orders
drop constraint if exists orders_subtotal_check;
alter table if exists public.orders
add constraint orders_subtotal_check
check (subtotal >= 0);

alter table if exists public.orders
drop constraint if exists orders_delivery_fee_check;
alter table if exists public.orders
add constraint orders_delivery_fee_check
check (delivery_fee >= 0);

alter table if exists public.orders
drop constraint if exists orders_total_check;
alter table if exists public.orders
add constraint orders_total_check
check (total >= 0);

alter table if exists public.order_items
drop constraint if exists order_items_unit_price_check;
alter table if exists public.order_items
add constraint order_items_unit_price_check
check (unit_price >= 0);

alter table if exists public.order_items
drop constraint if exists order_items_line_total_check;
alter table if exists public.order_items
add constraint order_items_line_total_check
check (line_total >= 0);

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
  text,
  text,
  text
);

drop function if exists public.create_order_with_items_atomic(
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  numeric,
  uuid,
  jsonb,
  text
);

drop function if exists public.create_order_with_items_atomic(
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  numeric,
  uuid,
  jsonb,
  text,
  text,
  text
);

create or replace function public.create_order_with_items_atomic(
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_customer_location text,
  p_subtotal numeric(12, 2),
  p_delivery_fee numeric(12, 2),
  p_total numeric(12, 2),
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

  if p_subtotal < 0
    or p_delivery_fee < 0
    or p_total < 0
    or round(p_total, 2) <> round(p_subtotal + p_delivery_fee, 2) then
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
      unit_price numeric(12, 2),
      line_total numeric(12, 2)
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

    if v_item.line_total is null
      or round(v_item.line_total, 2) <> round(v_item.quantity::numeric * v_item.unit_price, 2) then
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
    round(p_subtotal, 2),
    round(p_delivery_fee, 2),
    round(p_total, 2)
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
    round(item.unit_price, 2),
    round(item.line_total, 2)
  from jsonb_to_recordset(p_items) as item(
    product_id text,
    variant_id text,
    selected_color text,
    selected_size text,
    product_name text,
    quantity integer,
    unit_price numeric(12, 2),
    line_total numeric(12, 2)
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
