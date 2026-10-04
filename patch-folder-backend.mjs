
import fs from 'node:fs';const p='C:/Users/Ilya/Documents/GitHub/ilya-hub-backend/supabase/functions/hub/index.ts';let s=fs.readFileSync(p,'utf8');if(!s.includes('async function deleteFolderBatch('))s=s.replace('Deno.serve(async (request)=>{',fs.readFileSync('folder-delete-backend.txt','utf8')+'\nDeno.serve(async (request)=>{');
s=s.replace("if (path === '/health')","if(path==='/folders/delete-batch'&&request.method==='POST')return response(200,await deleteFolderBatch(await request.json()));\n    if (path === '/health')");
s=s.replace("scope: 'openid email https://www.googleapis.com/auth/gmail.modify'+","scope: 'openid email '+(url.searchParams.get('permanentDelete')==='true'?'https://mail.google.com/':'https://www.googleapis.com/auth/gmail.modify')+");
fs.writeFileSync(p,s);fs.writeFileSync('supabase/functions/hub/index.ts',s);console.log('Live-provider folder purge endpoint installed');
