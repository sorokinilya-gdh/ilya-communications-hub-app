import fs from 'node:fs';import assert from 'node:assert/strict';
const root='C:/Users/Ilya/Documents/GitHub/ilya-communications-hub-recovered/site/';
let b=fs.readFileSync(root+'supabase/functions/hub/index.ts','utf8');
const endpoint=`async function spamSenderAcrossMailboxes(payload){
 const db=admin(),id=String(payload.id||'');
 const source=await db.from('communication_messages').select('id,sender_email').eq('id',id).maybeSingle();
 if(source.error)throw source.error;
 const sender=String(source.data?.sender_email||'').trim().toLowerCase();
 if(!sender||!sender.includes('@'))return response(400,{error:'No valid sender address for spam matching'});
 const {data:rows,error}=await db.from('communication_messages').select('id,provider,mailbox_owner,sender_email,raw_metadata,provider_labels').ilike('sender_email',sender).order('id').limit(10000);
 if(error)throw error;
 const matches=(rows||[]).filter(r=>String(r.sender_email||'').toLowerCase()===sender&&r.raw_metadata?.hubFolder!=='spam'&&!(r.provider_labels||[]).includes('SPAM')&&r.raw_metadata?.hubFolder!=='trash'&&!(r.provider_labels||[]).includes('TRASH'));
 const succeeded=[],failed=[];
 for(const row of matches){try{const result=await executeMessageAction({id:row.id,provider:row.provider,mailbox:row.mailbox_owner,action:'spam',sender});if(result.status===200)succeeded.push(row.id);else failed.push({id:row.id,error:'Provider did not confirm spam move'})}catch(e){failed.push({id:row.id,error:String(e.message||e)})}}
 await savePersonalPreference({scope:'sender',key:sender,spam:true});
 return response(200,{ok:true,sender,matched:matches.length,moved:succeeded.length,failed,more:rows.length===10000});
}
`;
assert(b.includes('async function executeMessageAction(payload)'));b=b.replace('async function executeMessageAction(payload)',endpoint+'\nasync function executeMessageAction(payload)');
const route="if(path==='/message/action'&&request.method==='POST')return await executeMessageAction(await request.json());";
assert(b.includes(route));b=b.replace(route,"if(path==='/message/spam-sender'&&request.method==='POST')return await spamSenderAcrossMailboxes(await request.json());\n    "+route);
fs.writeFileSync(root+'supabase/functions/hub/index.ts',b);
let js=fs.readFileSync(root+'assets/index-MailboxCounters20261010.js','utf8');
const old="const actions=folder==='trash'?[['trash','Delete selected'],['restore','Restore selected']]:folder==='spam'?[['trash','Delete selected'],['restore','Not Spam']]:";
const next="const actions=folder==='trash'?[['trash','Delete selected'],['restore','Restore selected']]:folder==='spam'?[['trash','Delete selected'],['restore','Not Spam'],['archive','Archive']]:";
assert(js.includes(old));js=js.replace(old,next);
const move="async function move(item,restore){";
assert(js.includes(move));
js=js.replace(move,`async function spamAllSender(item){if(!beginAction())return;actionEpoch.current++;setBusy(true);setNotice('Moving all messages from this sender to Spam across connected mailboxes…');try{const {data}=await Un.post('/message/spam-sender',{id:item.id});setNotice('Moved '+data.moved+' of '+data.matched+' matching messages to Spam'+(data.failed?.length?'; '+data.failed.length+' failed':'')+'.');setVersion(x=>x+1);window.dispatchEvent(new CustomEvent('hub-mailbox-count',{detail:{}}));}catch(e){setNotice(e.message)}finally{finishAction()}}
 `+move);
const btn="children:'Delete'}),";
const pos=js.indexOf("function HubFolderPages20261004");
const segment=js.slice(pos);
const at=segment.indexOf("children:'Delete'}),");
console.log('Delete button occurrence',at);
fs.writeFileSync(root+'assets/index-SenderSpam20261010.js',js);
let html=fs.readFileSync(root+'index.html','utf8');assert(html.includes('index-MailboxCounters20261010.js'));fs.writeFileSync(root+'index.html',html.replace('index-MailboxCounters20261010.js','index-SenderSpam20261010.js'));
