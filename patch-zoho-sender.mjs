import fs from 'node:fs';
const path='supabase/functions/hub/index.ts';let s=fs.readFileSync(path,'utf8');const start=s.indexOf('async function sendZoho(payload)'),end=s.indexOf('Deno.serve(',start);if(start<0||end<0)throw Error('sendZoho boundary missing');
const replacement=`async function sendZoho(payload) {
 const db=admin(),{data:records,error}=await db.from('communication_integrations').select('*').or('provider.eq.zoho,provider.like.zoho:%');if(error)throw error;
 const candidates=[...(records||[])].sort((a,b)=>Number(String(b.organization_name||'').toLowerCase()===String(payload.from).toLowerCase())-Number(String(a.organization_name||'').toLowerCase()===String(payload.from).toLowerCase()));let rejected='';
 for(const record of candidates){const refreshed=await fetch('https://accounts.zoho.com/oauth/v2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',client_id:env('ZOHO_CLIENT_ID'),client_secret:env('ZOHO_CLIENT_SECRET'),refresh_token:decryptToken(record)})});const token=await refreshed.json();if(!refreshed.ok||!token.access_token)continue;
 const headers={Authorization:'Zoho-oauthtoken '+token.access_token},listed=await fetch('https://mail.zoho.com/api/accounts',{headers});if(!listed.ok)continue;
 for(const account of extractAccountRecords(await listed.json())){const email=field(account,'primaryEmailAddress','mailboxAddress','mailId');if(email.toLowerCase()!==String(payload.from).toLowerCase())continue;
 const accountId=field(account,'accountId','accountID'),sent=await fetch('https://mail.zoho.com/api/accounts/'+accountId+'/messages',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({fromAddress:payload.from,toAddress:payload.to.join(','),subject:payload.subject,content:payload.body,mailFormat:'plaintext'})}),result=await sent.json();const status=Number(result.status?.code||sent.status);
 if(!sent.ok||status>=400){const code=String(result.data?.errorCode||result.data?.error?.code||result.status?.description||sent.status).slice(0,180);if(sent.status===401||sent.status===403||status===401||status===403){rejected='Zoho rejected send authorization ('+code+'). Reconnect this mailbox with message-send permission.';continue}throw new Error('Zoho send failed: '+code)}
 return{provider:'zoho',providerMessageId:field(result.data||result,'messageId','messageID','id')||null};
 }}
 throw new Error(rejected||'Zoho sender is not connected');
}
`;
s=s.slice(0,start)+replacement+s.slice(end);fs.writeFileSync(path,s);console.log('Zoho credential selection patched; auth-rejected credentials may fall back; other failures stop.');
