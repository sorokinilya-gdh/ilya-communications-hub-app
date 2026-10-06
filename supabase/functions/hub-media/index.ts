import PostalMime from 'npm:postal-mime@3.0.1';
import {Buffer} from 'node:buffer';
import {createHash} from 'node:crypto';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'GET,OPTIONS'};
const reply=(status,value)=>new Response(JSON.stringify(value),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
Deno.serve(async request=>{
 if(request.method==='OPTIONS')return new Response('',{headers:cors});
 if(request.method!=='GET')return reply(405,{error:'Read-only attachment endpoint.'});
 const url=new URL(request.url),id=url.searchParams.get('id'),attachment=url.searchParams.get('attachment');
 if(!id)return reply(400,{error:'Message ID required.'});
 const bridge=url.pathname.includes('/bridge/');
 // The existing Hub verifies workspace JWTs or the restricted GCH bridge key,
 // and applies mailbox scope before releasing the original MIME message.
 const original=await fetch(Deno.env.get('SUPABASE_URL')+'/functions/v1/hub/'+(bridge?'bridge/':'')+'message/download?id='+encodeURIComponent(id),{headers:{authorization:request.headers.get('authorization')||'',apikey:request.headers.get('apikey')||Deno.env.get('SUPABASE_ANON_KEY')||''}});
 if(!original.ok){const detail=await original.text();return new Response(detail,{status:original.status,headers:{...cors,'Content-Type':'application/json'}})}
 try{
 const payload=await original.json();
 const raw=Buffer.from(payload.rawBase64||payload.base64||payload.contentBase64||'','base64');
 if(!raw.length)return reply(502,{error:'Original message did not include MIME bytes.'});
 if(raw.length>40*1024*1024)return reply(413,{error:'Message exceeds the attachment processing limit.'});
 const parsed=await PostalMime.parse(new Uint8Array(raw),{forceRfc822Attachments:true,attachmentEncoding:'base64'});
 const parts=parsed.attachments.map((file,index)=>{const base64=String(file.content||''),bytes=Buffer.from(base64,'base64');return{id:String(index)+'-'+createHash('sha256').update(bytes).digest('hex').slice(0,16),filename:file.filename||'attachment-'+(index+1),mimeType:file.mimeType||'application/octet-stream',size:bytes.length,inline:file.disposition==='inline'||file.related===true,contentId:file.contentId||null,base64}});
 if(attachment){const file=parts.find(x=>x.id===attachment);return file?reply(200,{attachment:file}):reply(404,{error:'Attachment not found.'})}
 return reply(200,{attachments:parts.map(({base64,...file})=>file)});
 }catch{return reply(502,{error:'Could not decode original message attachments.'})}
});