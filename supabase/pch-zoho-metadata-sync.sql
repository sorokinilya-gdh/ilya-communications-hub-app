CREATE OR REPLACE FUNCTION public.pch_upsert_zoho_metadata(p_rows jsonb) RETURNS void
LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF jsonb_typeof(p_rows)<>'array' OR jsonb_array_length(p_rows)>400 THEN RAISE EXCEPTION 'Invalid metadata batch'; END IF;
 INSERT INTO public.communication_messages AS existing
 (id,provider,mailbox_owner,sender_name,sender_email,recipients,subject,preview,received_at,unread,important,provider_labels,raw_metadata,updated_at)
 SELECT r.id,r.provider,r.mailbox_owner,r.sender_name,r.sender_email,r.recipients,r.subject,r.preview,r.received_at,r.unread,r.important,r.provider_labels,
 coalesce(r.raw_metadata,'{}'::jsonb)-'body'-'html'-'bodyHydrated',r.updated_at
 FROM jsonb_populate_recordset(NULL::public.communication_messages,p_rows) AS r WHERE r.provider='zoho'
 ON CONFLICT(id) DO UPDATE SET
 mailbox_owner=EXCLUDED.mailbox_owner,sender_name=EXCLUDED.sender_name,sender_email=EXCLUDED.sender_email,
 recipients=EXCLUDED.recipients,subject=EXCLUDED.subject,preview=EXCLUDED.preview,received_at=EXCLUDED.received_at,unread=EXCLUDED.unread,
 important=CASE WHEN existing.raw_metadata->>'importanceSource'='manual' THEN existing.important ELSE EXCLUDED.important END,
 raw_metadata=CASE WHEN existing.raw_metadata @> EXCLUDED.raw_metadata THEN existing.raw_metadata ELSE existing.raw_metadata||EXCLUDED.raw_metadata END,
 updated_at=EXCLUDED.updated_at
 WHERE (existing.sender_name,existing.sender_email,existing.recipients,existing.subject,existing.preview,existing.unread)
 IS DISTINCT FROM (EXCLUDED.sender_name,EXCLUDED.sender_email,EXCLUDED.recipients,EXCLUDED.subject,EXCLUDED.preview,EXCLUDED.unread)
 OR NOT(existing.raw_metadata @> EXCLUDED.raw_metadata);
END $$;
REVOKE ALL ON FUNCTION public.pch_upsert_zoho_metadata(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pch_upsert_zoho_metadata(jsonb) TO service_role;
NOTIFY pgrst,'reload schema';