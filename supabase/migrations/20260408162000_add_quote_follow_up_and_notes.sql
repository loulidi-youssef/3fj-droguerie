-- Lightweight quote CRM upgrade:
-- 1) Add follow-up fields on quote requests.
-- 2) Add internal admin notes per quote request.

alter table if exists public.quote_requests
add column if not exists contacted_at timestamptz null;

alter table if exists public.quote_requests
add column if not exists converted_at timestamptz null;

alter table if exists public.quote_requests
add column if not exists closed_at timestamptz null;

alter table if exists public.quote_requests
add column if not exists next_action text null;

update public.quote_requests
set contacted_at = coalesce(contacted_at, updated_at)
where status in ('contacted', 'converted', 'closed')
  and contacted_at is null;

update public.quote_requests
set converted_at = coalesce(converted_at, updated_at)
where status in ('converted', 'closed')
  and converted_at is null;

update public.quote_requests
set closed_at = coalesce(closed_at, updated_at)
where status = 'closed'
  and closed_at is null;

alter table if exists public.quote_requests
drop constraint if exists quote_requests_next_action_length_check;

alter table if exists public.quote_requests
add constraint quote_requests_next_action_length_check
check (
  next_action is null
  or char_length(btrim(next_action)) <= 1000
);

create or replace function public.quote_requests_apply_follow_up_defaults()
returns trigger
language plpgsql
as $$
begin
  if new.next_action is not null then
    new.next_action := nullif(btrim(new.next_action), '');
  end if;

  if new.status = 'contacted' then
    new.contacted_at := coalesce(new.contacted_at, now());
  elsif new.status = 'converted' then
    new.contacted_at := coalesce(new.contacted_at, now());
    new.converted_at := coalesce(new.converted_at, now());
  elsif new.status = 'closed' then
    new.closed_at := coalesce(new.closed_at, now());
  end if;

  return new;
end;
$$;

drop trigger if exists trg_quote_requests_follow_up_defaults on public.quote_requests;
create trigger trg_quote_requests_follow_up_defaults
before insert or update on public.quote_requests
for each row
execute function public.quote_requests_apply_follow_up_defaults();

create table if not exists public.quote_request_notes (
  id bigserial primary key,
  quote_request_id uuid not null references public.quote_requests(id) on delete cascade,
  content text not null,
  admin_identifier text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.quote_request_notes
add column if not exists quote_request_id uuid references public.quote_requests(id) on delete cascade;

alter table if exists public.quote_request_notes
add column if not exists content text;

alter table if exists public.quote_request_notes
add column if not exists admin_identifier text;

alter table if exists public.quote_request_notes
add column if not exists created_at timestamptz not null default now();

alter table if exists public.quote_request_notes
add column if not exists updated_at timestamptz not null default now();

delete from public.quote_request_notes
where quote_request_id is null;

update public.quote_request_notes
set content = coalesce(nullif(btrim(content), ''), 'Note legacy importee')
where content is null or btrim(content) = '';

update public.quote_request_notes
set admin_identifier = nullif(btrim(admin_identifier), '')
where admin_identifier is not null;

alter table if exists public.quote_request_notes
alter column quote_request_id set not null;

alter table if exists public.quote_request_notes
alter column content set not null;

alter table if exists public.quote_request_notes
drop constraint if exists quote_request_notes_content_check;

alter table if exists public.quote_request_notes
add constraint quote_request_notes_content_check
check (
  char_length(btrim(content)) between 1 and 2000
);

alter table if exists public.quote_request_notes
drop constraint if exists quote_request_notes_admin_identifier_length_check;

alter table if exists public.quote_request_notes
add constraint quote_request_notes_admin_identifier_length_check
check (
  admin_identifier is null
  or char_length(btrim(admin_identifier)) between 3 and 120
);

drop trigger if exists trg_quote_request_notes_updated_at on public.quote_request_notes;
create trigger trg_quote_request_notes_updated_at
before update on public.quote_request_notes
for each row
execute function public.set_updated_at();

create index if not exists idx_quote_request_notes_quote_request_id_created_at
on public.quote_request_notes(quote_request_id, created_at desc);

create index if not exists idx_quote_request_notes_created_at
on public.quote_request_notes(created_at desc);

alter table public.quote_request_notes enable row level security;

drop policy if exists "Service role can read quote request notes" on public.quote_request_notes;
create policy "Service role can read quote request notes"
on public.quote_request_notes
for select
to service_role
using (true);

drop policy if exists "Service role can create quote request notes" on public.quote_request_notes;
create policy "Service role can create quote request notes"
on public.quote_request_notes
for insert
to service_role
with check (true);

drop policy if exists "Service role can update quote request notes" on public.quote_request_notes;
create policy "Service role can update quote request notes"
on public.quote_request_notes
for update
to service_role
using (true)
with check (true);

drop policy if exists "Service role can delete quote request notes" on public.quote_request_notes;
create policy "Service role can delete quote request notes"
on public.quote_request_notes
for delete
to service_role
using (true);
