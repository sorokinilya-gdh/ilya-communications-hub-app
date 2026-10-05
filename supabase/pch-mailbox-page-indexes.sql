CREATE INDEX IF NOT EXISTS pch_archive_page_idx ON public.communication_messages (received_at DESC) WHERE ((provider='gmail' AND NOT(provider_labels @> ARRAY['INBOX']::text[]) AND NOT(provider_labels @> ARRAY['TRASH']::text[]) AND NOT(provider_labels @> ARRAY['SPAM']::text[])) OR (provider='zoho' AND raw_metadata->>'hubFolder'='archive'));
CREATE INDEX IF NOT EXISTS pch_inbox_page_idx ON public.communication_messages (received_at DESC) WHERE (provider <> 'gmail' OR provider_labels @> ARRAY['INBOX']::text[]);
ANALYZE public.communication_messages;
