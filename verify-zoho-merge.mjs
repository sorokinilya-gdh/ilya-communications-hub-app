import fs from 'node:fs';const token=fs.readFileSync(0,'utf8').trim();const query=`DO $test$
DECLARE fixture text:='zoho:metadata-test:'||gen_random_uuid()::text; payload jsonb; stored jsonb; saved_important boolean;
BEGIN
 BEGIN
 payload=jsonb_build_array(jsonb_build_object('id',fixture,'provider','zoho','mailbox_owner','synthetic@example.invalid','sender_name','Synthetic Test','sender_email','synthetic@example.invalid','recipients',jsonb_build_array('synthetic@example.invalid'),'subject','Synthetic metadata fixture','preview','Synthetic preview','received_at',now(),'unread',true,'important',false,'provider_labels',jsonb_build_array(),'raw_metadata',jsonb_build_object('providerId','fixture'),'updated_at',now()));
 PERFORM public.pch_upsert_zoho_metadata(payload);
 UPDATE public.communication_messages SET important=true,raw_metadata=raw_metadata||jsonb_build_object('body','synthetic-cached-body','html','synthetic-cached-html','bodyHydrated',true,'importanceSource','manual','hubFolder','archive') WHERE id=fixture;
 PERFORM public.pch_upsert_zoho_metadata(payload||'[]'::jsonb);
 SELECT raw_metadata,important INTO stored,saved_important FROM public.communication_messages WHERE id=fixture;
 ASSERT stored->>'body'='synthetic-cached-body','Cached body changed';
 ASSERT stored->>'html'='synthetic-cached-html','Cached HTML changed';
 ASSERT stored->>'hubFolder'='archive','Archive folder changed';
 ASSERT saved_important=true,'Manual importance changed';
 RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='Rollback synthetic fixture';
 EXCEPTION WHEN no_data_found THEN NULL;
 END;
END $test$;`;
const r=await fetch('https://api.supabase.com/v1/projects/ljaeqpayvntxipupaqij/database/query',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({query}),signal:AbortSignal.timeout(30000)});console.log(r.ok?'PASS: metadata import preserves cached body, HTML, archive and manual importance; fixture rolled back.':'FAIL: '+await r.text());if(!r.ok)process.exitCode=1;