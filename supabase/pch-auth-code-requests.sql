create table if not exists public.pch_auth_code_requests (
 provider text primary key,
 updated_at timestamptz not null default '1970-01-01T00:00:00Z',
 history_cursor text not null default '[]'
);
alter table public.pch_auth_code_requests enable row level security;
revoke all on public.pch_auth_code_requests from anon, authenticated;
grant all on public.pch_auth_code_requests to service_role;
