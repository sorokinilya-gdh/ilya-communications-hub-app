
alter table public.communication_messages drop constraint if exists communication_messages_provider_check;
alter table public.communication_messages add constraint communication_messages_provider_check check(provider in('gmail','zoho','whatsapp','telegram'));
insert into storage.buckets(id,name,public,file_size_limit) values('pch-message-media','pch-message-media',false,26214400) on conflict(id) do nothing;
-- This private bucket is only accessed through the authenticated Hub function.
