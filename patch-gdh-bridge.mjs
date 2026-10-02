import fs from 'node:fs';
const p='supabase/functions/hub/index.ts';let s=fs.readFileSync(p,'utf8');
const a=s.indexOf("    if (path === '/test-searches'");const b=s.indexOf('    const unauthorized = await requireIlya(request);',a);if(a<0||b<0)throw Error('Route anchor missing');s=s.slice(0,a)+s.slice(b);
const helper=`
const bridgeMailboxes = ['ceo@aimicrotec.com','is@gdh.ltd'];
async function handleGdhBridge(request,path,url) {
 const expected=Deno.env.get('GDH_BRIDGE_KEY_SHA256');
 const expires=Date.parse(Deno.env.get('GDH_BRIDGE_EXPIRES_AT')||'');
 if(!expected||!Number.isFinite(expires)||Date.now()>=expires)return response(503,{error:'GDH bridge is not enabled.'});
 const token=request.headers.get('authorization')?.replace(/^Bearer\\s+/i,'')||'';
 const actual=createHash('sha256').update(token).digest('hex');
 if(!/^[a-f0-9]{64}$/.test(expected)||!token||!timingSafeEqual(Buffer.from(actual),Buffer.from(expected)))return response(401,{error:'Bridge authentication required.'});
 if((path==='/bridge/messages'||path==='/bridge/search')&&request.method==='GET')return response(200,await listMessages(url,bridgeMailboxes));
 if(path==='/bridge/send'&&request.method==='POST'){
  const payload=await request.json();const from=String(payload.from||'').toLowerCase();const to=Array.isArray(payload.to)?payload.to.map(x=>String(x).toLowerCase()):[];
  if(!bridgeMailboxes.includes(from)||!to.length||to.some(x=>!bridgeMailboxes.includes(x)))return response(403,{error:'Bridge test is restricted to the two approved mailboxes.'});
  const provider=String(payload.provider||'').toLowerCase();if((from==='ceo@aimicrotec.com'&&provider!=='gmail')||(from==='is@gdh.ltd'&&provider!=='zoho'))return response(400,{error:'Sender and provider do not match.'});
  if(!payload.subject||typeof payload.body!=='string')return response(400,{error:'Subject and body are required.'});
  const result=provider==='gmail'?await sendGmail({...payload,from,to}):await sendZoho({...payload,from,to});return response(200,{sent:true,...result});
 }
 return response(404,{error:'Bridge operation unavailable.'});
}
`;
s=s.replace('Deno.serve(async (request)=>{',helper+'\nDeno.serve(async (request)=>{');
s=s.replace('    const unauthorized = await requireIlya(request);',"    if(path.startsWith('/bridge/'))return await handleGdhBridge(request,path,url);\n    const unauthorized = await requireIlya(request);");
s=s.replace('async function listMessages(url) {','async function listMessages(url, allowedMailboxes=null) {');
s=s.replace("  if (provider) query = query.eq('provider', provider);","  if(allowedMailboxes)query=query.in('mailbox_owner',allowedMailboxes);\n  if (provider) query = query.eq('provider', provider);");
s=s.replace("  if (provider) mailboxQuery = mailboxQuery.eq('provider', provider);","  if(allowedMailboxes)mailboxQuery=mailboxQuery.in('mailbox_owner',allowedMailboxes);\n  if (provider) mailboxQuery = mailboxQuery.eq('provider', provider);");
fs.writeFileSync(p,s);console.log('Prepared disabled, mailbox-scoped bridge; removed encryption-key test-search bypass.');
