create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid null references auth.users(id) on delete set null,
  anonymous_id text not null,
  payload jsonb not null,
  status text not null default 'new'
);

alter table public.quote_requests
add column if not exists updated_at timestamptz not null default now();

alter table public.quote_requests
add column if not exists user_id uuid null references auth.users(id) on delete set null;

alter table public.quote_requests
add column if not exists anonymous_id text;

alter table public.quote_requests
add column if not exists payload jsonb not null default '{}'::jsonb;

alter table public.quote_requests
add column if not exists status text not null default 'new';

update public.quote_requests
set anonymous_id = coalesce(nullif(btrim(anonymous_id), ''), concat('legacy_', id::text))
where anonymous_id is null or btrim(anonymous_id) = '';

alter table public.quote_requests
alter column anonymous_id set not null;

update public.quote_requests
set payload = '{}'::jsonb
where payload is null;

alter table public.quote_requests
alter column payload set not null;

drop trigger if exists trg_quote_requests_updated_at on public.quote_requests;
create trigger trg_quote_requests_updated_at
before update on public.quote_requests
for each row
execute function public.set_updated_at();

alter table public.quote_requests
drop constraint if exists quote_requests_status_check;

alter table public.quote_requests
add constraint quote_requests_status_check
check (status in ('new', 'contacted', 'converted', 'closed'));

alter table public.quote_requests
drop constraint if exists quote_requests_payload_object_check;

alter table public.quote_requests
add constraint quote_requests_payload_object_check
check (jsonb_typeof(payload) = 'object');

alter table public.quote_requests
drop constraint if exists quote_requests_anonymous_id_length_check;

alter table public.quote_requests
add constraint quote_requests_anonymous_id_length_check
check (char_length(btrim(anonymous_id)) >= 6);

create index if not exists idx_quote_requests_created_at
on public.quote_requests(created_at desc);

create index if not exists idx_quote_requests_status
on public.quote_requests(status);

create index if not exists idx_quote_requests_user_id
on public.quote_requests(user_id);

create index if not exists idx_quote_requests_anonymous_id
on public.quote_requests(anonymous_id);

alter table public.quote_requests enable row level security;

drop policy if exists "Authenticated users can read own quote requests" on public.quote_requests;
create policy "Authenticated users can read own quote requests"
on public.quote_requests
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Authenticated users can create own quote requests" on public.quote_requests;
create policy "Authenticated users can create own quote requests"
on public.quote_requests
for insert
to authenticated
with check (user_id is null or auth.uid() = user_id);

drop policy if exists "Anonymous users can create quote requests" on public.quote_requests;
create policy "Anonymous users can create quote requests"
on public.quote_requests
for insert
to anon
with check (user_id is null);

drop policy if exists "Service role can read quote requests" on public.quote_requests;
create policy "Service role can read quote requests"
on public.quote_requests
for select
to service_role
using (true);

drop policy if exists "Service role can update quote requests" on public.quote_requests;
create policy "Service role can update quote requests"
on public.quote_requests
for update
to service_role
using (true)
with check (true);

