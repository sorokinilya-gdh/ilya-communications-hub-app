create table if not exists public.personal_hub_contacts (
 email text primary key check(email=lower(email)), name text not null default '', company text not null default '', title text not null default '', phone text not null default '', website text not null default '', linkedin_url text not null default '', linkedin_status text not null default 'pending', evidence jsonb not null default '{}'::jsonb, source_message_id text, last_contact_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.personal_hub_preferences (
 scope text not null check(scope in ('sender','subject','message')), key text not null, importance boolean, spam boolean, updated_at timestamptz not null default now(), primary key(scope,key)
);
create table if not exists public.personal_hub_classification_state (
 id text primary key, cursor text not null default '', scanned bigint not null default 0, spam_moved bigint not null default 0, last_error text, updated_at timestamptz not null default now()
);
alter table public.personal_hub_contacts enable row level security;
alter table public.personal_hub_preferences enable row level security;
alter table public.personal_hub_classification_state enable row level security;
create index if not exists personal_hub_contacts_name on public.personal_hub_contacts(name);
