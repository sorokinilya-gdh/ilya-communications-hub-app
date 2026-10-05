CREATE OR REPLACE VIEW public.pch_compact_messages WITH (security_invoker=true) AS
 SELECT id,provider,mailbox_owner,sender_name,sender_email,recipients,subject,preview,received_at,unread,important,provider_labels,
 raw_metadata->>'hubFolder' AS hub_folder,
 jsonb_build_object('body',CASE WHEN provider='gmail' THEN left(coalesce(raw_metadata->>'body',''),8000) ELSE '' END) AS raw_metadata
 FROM public.communication_messages;
REVOKE ALL ON public.pch_compact_messages FROM anon,authenticated;
GRANT SELECT ON public.pch_compact_messages TO service_role;
NOTIFY pgrst,'reload schema';
