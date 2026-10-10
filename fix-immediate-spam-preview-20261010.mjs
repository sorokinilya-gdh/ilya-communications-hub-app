import fs from 'node:fs';import assert from 'node:assert/strict';
const root='C:/Users/Ilya/Documents/GitHub/ilya-communications-hub-recovered/site/';
let s=fs.readFileSync(root+'assets/index-BackgroundSpam20261010.js','utf8');
const a=s.indexOf('async function spamAllSender(item)'),b=s.indexOf(' async function move(item,restore)',a);
assert(a>0&&b>a);
const fn=`async function spamAllSender(item){
 const previousItems=items,previousTotal=total,previousOpened=openedMessage;
 const sender=String(item.email||item.senderEmail||'').trim().toLowerCase();
 const affected=new Set([item.id]);
 if(sender)for(const row of items)if(String(row.email||row.senderEmail||'').trim().toLowerCase()===sender)affected.add(row.id);
 actionEpoch.current++;backgroundRefresh.current=false;
 setItems(rows=>rows.filter(row=>!affected.has(row.id)));
 setTotal(n=>Math.max(0,n-affected.size));if(folder==='inbox'&&!search.trim())publishCount(Math.max(0,total-affected.size));
 setSelected(old=>new Set([...old].filter(id=>!affected.has(id))));
 if(openedMessage&&affected.has(openedMessage.id)){
   const next=HubNextPreview20261006(items,openedMessage.id,affected);
   setOpenedMessage(next||null);if(next)focusMessage(next.id);
 }
 setNotice('Spam sender queued. You can continue reading the next email.');
 try{
  const {data}=await Un.post('/message/spam-sender',{id:item.id});
  if(!data.queued)throw Error('Background task was not accepted');
  setNotice('Spam cleanup running for '+data.sender+'. You can continue reading.');
  const jobId=data.jobId;
  const poll=async()=>{try{
   const {data:job}=await Un.get('/message/spam-sender/status?id='+encodeURIComponent(jobId));
   if(job.status==='completed'){setNotice('Spam cleanup finished: '+(job.result?.moved||0)+' moved; '+(job.result?.failed?.length||0)+' failed.');window.dispatchEvent(new CustomEvent('hub-mailbox-count',{detail:{}}));setVersion(x=>x+1)}
   else if(job.status==='failed'){setNotice('Spam cleanup failed: '+(job.result?.error||'Unknown error'));setVersion(x=>x+1)}
   else setTimeout(poll,3000);
  }catch(e){setNotice('Spam cleanup status unavailable: '+e.message)}};
  setTimeout(poll,3000);
 }catch(e){
  setNotice('Spam cleanup could not start: '+e.message);
  setVersion(x=>x+1);
 }
}
`;
s=s.slice(0,a)+fn+s.slice(b);
fs.writeFileSync(root+'assets/index-ImmediateSpamPreview20261010.js',s);
let h=fs.readFileSync(root+'index.html','utf8');assert(h.includes('index-BackgroundSpam20261010.js'));fs.writeFileSync(root+'index.html',h.replace('index-BackgroundSpam20261010.js','index-ImmediateSpamPreview20261010.js'));
console.log('Prepared immediate removal and next preview');
