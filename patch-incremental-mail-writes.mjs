import fs from 'node:fs';const file='supabase/functions/hub/index.ts';let s=fs.readFileSync(file,'utf8');
const gmail="const { error } = await db.from('communication_messages').upsert(rows, {\n      onConflict: 'id'\n    });\n    if (error) throw new Error(`Gmail message storage failed: ${error.message}`);";
const zoho="const { error } = await db.from('communication_messages').upsert(rows, {\n      onConflict: 'id'\n    });\n    if (error) throw new Error(`Zoho message storage failed: ${error.message}`);";
if(!s.includes(gmail)||!s.includes(zoho))throw Error('Expected provider write blocks missing');
s=s.replace(gmail,"await persistMessageRows(rows, 'Gmail');").replace(zoho,"await persistMessageRows(rows, 'Zoho');");
const helper=`async function persistMessageRows(rows, provider) {
 const ordered=[...rows].sort((a,b)=>String(a.id).localeCompare(String(b.id)));
 for(let start=0;start<ordered.length;start+=10){const{error}=await admin().from('communication_messages').upsert(ordered.slice(start,start+10),{onConflict:'id'});if(error)throw new Error(provider+' message storage failed: '+error.message);}
}
`;s=s.replace('async function syncGmail(',helper+'async function syncGmail(');fs.writeFileSync(file,s);console.log('Provider writes commit in deterministic batches of at most ten rows; cursors advance only after all batches succeed.');
