alter table if exists public.quote_requests
add column if not exists next_action_due_at timestamptz null;

update public.quote_requests
set next_action_due_at = null
where status in ('converted', 'closed');

create index if not exists idx_quote_requests_next_action_due_at
on public.quote_requests(next_action_due_at)
where next_action_due_at is not null;
