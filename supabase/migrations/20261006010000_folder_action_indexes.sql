-- Match folder predicates so follow-up reads and exact counts avoid scanning message bodies.
CREATE INDEX IF NOT EXISTS pch_trash_page_idx ON public.communication_messages (received_at DESC)
 WHERE provider_labels @> ARRAY['TRASH']::text[] OR raw_metadata->>'hubFolder'='trash';
CREATE INDEX IF NOT EXISTS pch_spam_page_idx ON public.communication_messages (received_at DESC)
 WHERE provider_labels @> ARRAY['SPAM']::text[] OR raw_metadata->>'hubFolder'='spam';
CREATE INDEX IF NOT EXISTS pch_current_inbox_page_idx ON public.communication_messages (received_at DESC)
 WHERE (provider='gmail' AND provider_labels @> ARRAY['INBOX']::text[])
 OR (provider='zoho' AND (raw_metadata->>'hubFolder'='inbox' OR raw_metadata->>'hubFolder' IS NULL));
NOTIFY pgrst,'reload schema';
