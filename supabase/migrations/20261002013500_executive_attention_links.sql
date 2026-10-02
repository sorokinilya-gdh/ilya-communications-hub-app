create table if not exists public.communication_executive_attention (
 id uuid primary key default gen_random_uuid(),
 source_owner_id uuid not null,
 source_bridge_id uuid not null,
 source_communication_id uuid not null,
 source_updated_at timestamptz not null,
 project_name text,
 subject text not null,
 attention_reason text not null,
 executive_summary text,
 proposed_action text,
 contact_info jsonb,
 deep_link text not null,
 priority text not null default 'normal' check(priority in ('normal','high','urgent')),
 status text not null default 'needs_attention' check(status in ('needs_attention','opened','resolved','dismissed')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(source_owner_id,source_communication_id)
);
alter table public.communication_executive_attention enable row level security;
create index if not exists communication_executive_attention_open_idx on public.communication_executive_attention(status,updated_at desc);
-- No direct client policy: access is through authenticated Hub routes only.
