
import fs from 'node:fs';
const p='C:/Users/Ilya/Documents/GitHub/ilya-hub-backend/supabase/functions/hub/index.ts';let s=fs.readFileSync(p,'utf8');
const helper=String.raw`
function displayIdentity(row){
 const meta=row.raw_metadata||{},body=String(meta.body||row.preview||'');
 let name=row.sender_name||'',email=row.sender_email||'',recipient=(row.recipients||[]).map(x=>typeof x==='string'?x:(x.emailAddress||x.address||x.email||'')).filter(Boolean).join(', ')||row.mailbox_owner;
 const form=formIdentity(name,email,row.subject||'',body);
 if(form.source_type==='website_form'){name=form.sender_name;email=form.sender_email}
 const marker=body.search(/(?:-{2,}\s*(?:Forwarded message|Original Message)\s*-{2,}|Begin forwarded message:)/i);
 if(marker>=0){const block=body.slice(marker,marker+2000),from=block.match(/(?:^|\n)\s*From:\s*([^\r\n]+)/i),to=block.match(/(?:^|\n)\s*To:\s*([^\r\n]+)/i);
 if(from){const parsed=address(from[1].trim());if(/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(parsed.email)){name=parsed.name;email=parsed.email;if(to)recipient=to[1].trim()}}
 }
 return {name:name||email||'Unknown sender',email,recipient};
}
`;
if(!s.includes('function displayIdentity('))s=s.replace('function uiMessage(row) {',helper+'\nfunction uiMessage(row) {\n  const identity=displayIdentity(row);');
s=s.replace("sender: row.sender_name || row.sender_email || 'Unknown sender',","sender: identity.name,").replace("email: row.sender_email || '',","email: identity.email,").replace('originalRecipient: row.mailbox_owner,','originalRecipient: identity.recipient,\n    toAddress: identity.recipient,');
s=s.replace("const email=String(row.sender_email||'').toLowerCase();","const identity=displayIdentity(row);const email=String(identity.email||'').toLowerCase();");
s=s.replace('const name=row.sender_name&&row.sender_name!==email?row.sender_name:email;','const name=identity.name&&identity.name!==email?identity.name:email;');
fs.writeFileSync(p,s);fs.writeFileSync('supabase/functions/hub/index.ts',s);console.log('Stored-message display and contact creation share resolved sender identity; actual recipients exposed');
