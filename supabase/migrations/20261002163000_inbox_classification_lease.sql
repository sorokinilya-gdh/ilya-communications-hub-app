alter table public.personal_hub_classification_state add column if not exists lease_until timestamptz;
create or replace function public.claim_personal_inbox_review() returns boolean language plpgsql security invoker as $$
begin
 insert into public.personal_hub_classification_state(id) values('inbox') on conflict(id) do nothing;
 update public.personal_hub_classification_state set lease_until=now()+interval '120 seconds' where id='inbox' and (lease_until is null or lease_until<now());
 return found;
end;
$$;
revoke all on function public.claim_personal_inbox_review() from public,anon,authenticated;
grant execute on function public.claim_personal_inbox_review() to service_role;
