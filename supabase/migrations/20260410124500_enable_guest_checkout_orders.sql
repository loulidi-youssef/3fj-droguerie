-- Enable guest checkout while preserving idempotency + stock safety.
-- - order_idempotency_keys.user_id can be null for guest orders
-- - atomic order function accepts null p_user_id (guest), no AUTH_REQUIRED gate

alter table if exists public.order_idempotency_keys
alter column user_id drop not null;

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
  p_request_fingerprint text,
  p_delivery_option text,
  p_customer_note text default null
)
returns uuid
language plpgsql
as $$
declare
  v_order_id uuid;
  v_item record;
  v_rows integer;
  v_fulfillment_method text;
  v_delivery_option text;
  v_customer_note text;
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

  v_fulfillment_method := coalesce(nullif(lower(btrim(p_fulfillment_method)), ''), 'delivery');
  if v_fulfillment_method not in ('delivery', 'pickup') then
    raise exception 'INVALID_FULFILLMENT_METHOD';
  end if;

  v_delivery_option := coalesce(
    nullif(lower(btrim(p_delivery_option)), ''),
    case when v_fulfillment_method = 'pickup' then 'pickup' else 'standard' end
  );
  if v_fulfillment_method = 'pickup' and v_delivery_option <> 'pickup' then
    raise exception 'INVALID_DELIVERY_OPTION';
  end if;
  if v_fulfillment_method = 'delivery' and v_delivery_option not in ('standard', 'express') then
    raise exception 'INVALID_DELIVERY_OPTION';
  end if;

  v_customer_note := nullif(btrim(p_customer_note), '');
  if v_customer_note is not null and char_length(v_customer_note) > 500 then
    raise exception 'INVALID_CUSTOMER_NOTE';
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
    delivery_option,
    customer_name,
    customer_phone,
    customer_address,
    customer_location,
    customer_note,
    subtotal,
    delivery_fee,
    total
  )
  values (
    p_user_id,
    v_fulfillment_method,
    v_delivery_option,
    p_customer_name,
    p_customer_phone,
    p_customer_address,
    p_customer_location,
    v_customer_note,
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
