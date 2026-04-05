-- Customer favorites / wishlist table
-- Keeps favorites user-specific and simple.

create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create index if not exists idx_favorites_user_id_created_at
on public.favorites(user_id, created_at desc);

alter table public.favorites enable row level security;

drop policy if exists "Authenticated users can read own favorites" on public.favorites;
create policy "Authenticated users can read own favorites"
on public.favorites
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Authenticated users can add own favorites" on public.favorites;
create policy "Authenticated users can add own favorites"
on public.favorites
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Authenticated users can remove own favorites" on public.favorites;
create policy "Authenticated users can remove own favorites"
on public.favorites
for delete
to authenticated
using (auth.uid() = user_id);
