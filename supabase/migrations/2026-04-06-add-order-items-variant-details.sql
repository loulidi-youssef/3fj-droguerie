alter table public.order_items
add column if not exists variant_id uuid;

alter table public.order_items
add column if not exists selected_color text;

alter table public.order_items
add column if not exists selected_size text;

create or replace function public.create_order_with_items_atomic(
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_customer_location text,
  p_subtotal integer,
  p_delivery_fee integer,
  p_total integer,
  p_user_id uuid,
  p_items jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_order_id uuid;
  v_item record;
  v_rows integer;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'ORDER_ITEMS_EMPTY';
  end if;

  if p_subtotal < 0 or p_delivery_fee < 0 or p_total < 0 or p_total <> (p_subtotal + p_delivery_fee) then
    raise exception 'INVALID_ORDER_TOTALS';
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

  return v_order_id;
end;
$$;
