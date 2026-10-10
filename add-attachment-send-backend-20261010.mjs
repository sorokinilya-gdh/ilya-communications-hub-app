import fs from 'node:fs';import assert from 'node:assert/strict';
const path='C:/Users/Ilya/Documents/GitHub/ilya-communications-hub-recovered/site/supabase/functions/hub/index.ts';
let s=fs.readFileSync(path,'utf8');
const marker='async function sendGmail(payload) {';
assert(s.includes(marker));
const helper=`function validatedOutgoingAttachments(payload){
 const items=payload.attachments||[];if(!Array.isArray(items)||items.length>20)throw Error('Maximum 20 attachments');
 let size=0;return items.map(item=>{const name=String(item.name||'attachment').replace(/[\\r\\n"\\\\]/g,'_').slice(0,160),type=/^[\\w.+-]+\\/[\\w.+-]+$/.test(item.type||'')?item.type:'application/octet-stream',data=String(item.data||'').replace(/\\s/g,'');
 if(!/^[A-Za-z0-9+/]*={0,2}$/.test(data))throw Error('Invalid attachment encoding');size+=Math.floor(data.length*3/4);if(size>20*1024*1024)throw Error('Combined attachment limit is 20 MB');return{name,type,data}})}
function makeOutgoingMime(payload,attachments){
 const boundary='pch_'+crypto.randomUUID().replace(/-/g,''),subject=String(payload.subject||'').replace(/[\\r\\n]/g,' ');
 const headers=['From: '+payload.from,'To: '+payload.to.join(', '),'Subject: =?UTF-8?B?'+Buffer.from(subject).toString('base64')+'?=','MIME-Version: 1.0'];
 if(!attachments.length)return [...headers,'Content-Type: text/plain; charset=UTF-8','',payload.body].join('\\r\\n');
 const lines=[...headers,'Content-Type: multipart/mixed; boundary="'+boundary+'"','','--'+boundary,'Content-Type: text/plain; charset=UTF-8','',''+payload.body];
 for(const item of attachments){lines.push('--'+boundary,'Content-Type: '+item.type+'; name="'+item.name+'"','Content-Disposition: attachment; filename="'+item.name+'"','Content-Transfer-Encoding: base64','',item.data.replace(/.{1,76}/g,'$&\\r\\n'))}
 lines.push('--'+boundary+'--','');return lines.join('\\r\\n')
}
`;
s=s.replace(marker,helper+marker);
const old="const mime=['From: '+payload.from,'To: '+payload.to.join(', '),'Subject: '+payload.subject,'MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','',payload.body].join('\\r\\n');";
assert(s.includes(old));s=s.replace(old,"const mime=makeOutgoingMime(payload,validatedOutgoingAttachments(payload));");
const zoho='async function sendZoho(payload) {';
assert(s.includes(zoho));s=s.replace(zoho,"async function sendZoho(payload) {\n if(validatedOutgoingAttachments(payload).length)throw Error('Zoho attachment sending is not yet enabled. Files were not sent. Your draft is preserved.');");
fs.writeFileSync(path,s);console.log('Gmail MIME attachment support and explicit Zoho safeguard prepared');
