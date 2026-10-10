import fs from 'node:fs';import assert from 'node:assert/strict';
const root='C:/Users/Ilya/Documents/GitHub/ilya-communications-hub-recovered/site/';
let b=fs.readFileSync(root+'supabase/functions/hub/index.ts','utf8');
const original="if(path==='/message/spam-sender'&&request.method==='POST')return await spamSenderAcrossMailboxes(await request.json());";
assert(b.includes(original));
b=b.replace(original,`if(path==='/message/spam-sender'&&request.method==='POST'){
      const payload=await request.json(),id=String(payload.id||'');
      const source=await admin().from('communication_messages').select('id,sender_email').eq('id',id).maybeSingle();
      if(source.error)throw source.error;
      if(!source.data?.sender_email)return response(400,{error:'Sender address unavailable'});
      const jobId=crypto.randomUUID(),sender=String(source.data.sender_email).toLowerCase();
      const queued=await admin().from('pch_spam_sender_jobs').insert({id:jobId,sender,status:'queued',created_at:new Date().toISOString()});
      if(queued.error)throw queued.error;
      EdgeRuntime.waitUntil((async()=>{
        try{
          await admin().from('pch_spam_sender_jobs').update({status:'running'}).eq('id',jobId);
          const result=await spamSenderAcrossMailboxes(payload),data=await result.json();
          await admin().from('pch_spam_sender_jobs').update({status:'completed',result:data,finished_at:new Date().toISOString()}).eq('id',jobId);
        }catch(e){await admin().from('pch_spam_sender_jobs').update({status:'failed',result:{error:String(e.message||e)},finished_at:new Date().toISOString()}).eq('id',jobId)}
      })());
      return response(202,{ok:true,queued:true,jobId,sender});
    }
    if(path==='/message/spam-sender/status'&&request.method==='GET'){
      const id=url.searchParams.get('id')||'';
      if(!/^[0-9a-f-]{36}$/i.test(id))return response(400,{error:'Invalid job id'});
      const result=await admin().from('pch_spam_sender_jobs').select('id,status,result').eq('id',id).maybeSingle();
      if(result.error)throw result.error;
      return result.data?response(200,result.data):response(404,{error:'Job not found'});
    }`);
fs.writeFileSync(root+'supabase/functions/hub/index.ts',b);
let s=fs.readFileSync(root+'assets/index-SenderSpam20261010.js','utf8');
const start=s.indexOf('async function spamAllSender(item)'),end=s.indexOf(' async function move(item,restore)',start);
assert(start>0&&end>start);
s=s.slice(0,start)+`async function spamAllSender(item){setNotice('Sender-wide spam cleanup queued in background. You can continue reading emails.');try{const {data}=await Un.post('/message/spam-sender',{id:item.id});if(!data.queued)throw Error('Background task was not accepted');setNotice('Spam cleanup running for '+data.sender+'. You can continue reading.');const jobId=data.jobId;const poll=async()=>{try{const {data:job}=await Un.get('/message/spam-sender/status?id='+encodeURIComponent(jobId));if(job.status==='completed'){setNotice('Spam cleanup finished: '+(job.result?.moved||0)+' moved; '+(job.result?.failed?.length||0)+' failed.');window.dispatchEvent(new CustomEvent('hub-mailbox-count',{detail:{}}));setVersion(x=>x+1)}else if(job.status==='failed')setNotice('Spam cleanup failed: '+(job.result?.error||'Unknown error'));else setTimeout(poll,3000)}catch(e){setNotice('Spam cleanup status unavailable: '+e.message)}};setTimeout(poll,3000)}catch(e){setNotice('Spam cleanup could not start: '+e.message)}}
`+s.slice(end);
fs.writeFileSync(root+'assets/index-BackgroundSpam20261010.js',s);
let h=fs.readFileSync(root+'index.html','utf8');assert(h.includes('index-SenderSpam20261010.js'));fs.writeFileSync(root+'index.html',h.replace('index-SenderSpam20261010.js','index-BackgroundSpam20261010.js'));
console.log('Background queue patch prepared');
