alter table public.personal_hub_classification_state add column if not exists watch_since timestamptz;
alter table public.personal_hub_classification_state add column if not exists pass_started_at timestamptz;
