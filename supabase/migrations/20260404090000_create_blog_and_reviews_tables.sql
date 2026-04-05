-- 3FJ Droguerie - create blog_posts and reviews tables
-- Run this migration in Supabase SQL Editor.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.blog_posts (
  id text primary key,
  slug text not null unique,
  title text not null,
  excerpt text not null,
  content text not null,
  cover_image_path text not null,
  seo_title text null,
  seo_description text null,
  is_published boolean not null default false,
  published_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_blog_posts_updated_at on public.blog_posts;
create trigger trg_blog_posts_updated_at
before update on public.blog_posts
for each row
execute function public.set_updated_at();

create index if not exists idx_blog_posts_slug on public.blog_posts(slug);
create index if not exists idx_blog_posts_is_published on public.blog_posts(is_published);
create index if not exists idx_blog_posts_published_at on public.blog_posts(published_at desc);

create table if not exists public.reviews (
  id text primary key,
  customer_name text not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  testimonial_text text not null,
  role text null,
  avatar_image_path text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_reviews_updated_at on public.reviews;
create trigger trg_reviews_updated_at
before update on public.reviews
for each row
execute function public.set_updated_at();

create index if not exists idx_reviews_is_active on public.reviews(is_active);
create index if not exists idx_reviews_created_at on public.reviews(created_at desc);

alter table public.blog_posts enable row level security;
alter table public.reviews enable row level security;

drop policy if exists "Public can read published blog posts" on public.blog_posts;
create policy "Public can read published blog posts"
on public.blog_posts
for select
to anon, authenticated
using (
  is_published = true
  and (published_at is null or published_at <= now())
);

drop policy if exists "Public can read active reviews" on public.reviews;
create policy "Public can read active reviews"
on public.reviews
for select
to anon, authenticated
using (is_active = true);
