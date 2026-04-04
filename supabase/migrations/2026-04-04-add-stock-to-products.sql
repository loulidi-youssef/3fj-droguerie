-- Add stock column for admin product management.
-- Run this once if your project was created before stock support.

alter table public.products
add column if not exists stock integer not null default 0 check (stock >= 0);
