create or replace function public.upsert_executive_attention_link(payload jsonb)
returns setof public.communication_executive_attention
language plpgsql set search_path=public as $$
begin
 return query
 insert into public.communication_executive_attention
 (source_owner_id,source_bridge_id,source_communication_id,source_updated_at,project_name,subject,attention_reason,executive_summary,proposed_action,priority,status,contact_info,deep_link,updated_at)
 select x.source_owner_id,x.source_bridge_id,x.source_communication_id,x.source_updated_at,x.project_name,x.subject,x.attention_reason,x.executive_summary,x.proposed_action,x.priority,x.status,x.contact_info,x.deep_link,x.updated_at
 from jsonb_populate_record(null::public.communication_executive_attention,payload) x
 on conflict(source_owner_id,source_communication_id) do update set
 source_bridge_id=excluded.source_bridge_id,source_updated_at=excluded.source_updated_at,
 project_name=excluded.project_name,subject=excluded.subject,attention_reason=excluded.attention_reason,
 executive_summary=excluded.executive_summary,proposed_action=excluded.proposed_action,
 priority=excluded.priority,status=excluded.status,contact_info=excluded.contact_info,
 deep_link=excluded.deep_link,updated_at=excluded.updated_at
 where public.communication_executive_attention.status not in ('resolved','dismissed')
 or excluded.source_updated_at>public.communication_executive_attention.updated_at
 returning *;
 if not found then
  return query select * from public.communication_executive_attention
  where source_owner_id=(payload->>'source_owner_id')::uuid
  and source_communication_id=(payload->>'source_communication_id')::uuid;
 end if;
end;$$;
revoke all on function public.upsert_executive_attention_link(jsonb) from public,anon,authenticated;
grant execute on function public.upsert_executive_attention_link(jsonb) to service_role;
notify pgrst,'reload schema';
