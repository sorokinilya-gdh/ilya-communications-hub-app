import fs from 'node:fs';const root='C:/Users/Ilya/Documents/GitHub/ilya-communications-hub-recovered/site';let s=fs.readFileSync(root+'/assets/index-ArchivePersistent20261005.js','utf8');
function swap(a,b){if(!s.includes(a))throw Error('Missing patch: '+a.slice(0,60));s=s.replace(a,b)}
swap('s==="Spam Review"?m.jsx(HubFolderPages20261004','s==="Unified Inbox"?m.jsx(HubFolderPages20261004,{folder:"inbox",search:c},"inbox"):s==="Spam Review"?m.jsx(HubFolderPages20261004');
swap('function HubFolderPages20261004({folder,importantOnly=false})','function HubFolderPages20261004({folder,importantOnly=false,search=""})');
swap("[folder,importantOnly,page,pageSize,version]);","[folder,importantOnly,page,pageSize,version,search]);");
swap("(importantOnly?'&importantOnly=true':''))","(importantOnly?'&importantOnly=true':'')+(search.trim().length>=2?'&search='+encodeURIComponent(search.trim()):''))");
swap("const title=folder==='archive'?","const title=folder==='inbox'?'Unified Inbox':folder==='archive'?");
s=s.replaceAll("folder!=='archive'&&m.jsx('button'","['trash','spam'].includes(folder)&&m.jsx('button'");
swap("action:restore?'restore':'trash'","action:restore?(folder==='inbox'?'archive':'restore'):'trash'");
swap("setNotice(restore?'Restored to Inbox':'Moved to Trash')","setNotice(restore?(folder==='inbox'?'Archived':'Restored to Inbox'):'Moved to Trash')");
swap("children:folder==='spam'?'Not Spam':'Restore'","children:folder==='inbox'?'Archive':folder==='spam'?'Not Spam':'Restore'");
swap("const selectedRecords=F.useRef(new Map());F.useEffect","F.useEffect(()=>{setPage(1)},[search]);F.useEffect(()=>{if(folder!=='inbox')return;let timer;const refresh=e=>{if(e.detail.ok){clearTimeout(timer);timer=setTimeout(()=>setVersion(x=>x+1),1000)}};window.addEventListener('hub-sync-health',refresh);return()=>{clearTimeout(timer);window.removeEventListener('hub-sync-health',refresh)}},[folder]);const selectedRecords=F.useRef(new Map());F.useEffect");
const a=s.indexOf('function HubPersistentSync20261004'),b=s.indexOf('function HubMergeRows20261004',a);let sync=s.slice(a,b).replace("+'&limit=500&offset='","+'&limit=100&offset='").replace('offset+=500;','offset+=100;');s=s.slice(0,a)+sync+s.slice(b);
fs.writeFileSync(root+'/assets/index-InboxPages20261005.js',s);fs.writeFileSync(root+'/index.html',fs.readFileSync(root+'/index.html','utf8').replace('index-ArchivePersistent20261005.js','index-InboxPages20261005.js'));console.log('Unified Inbox uses direct 25/50/100 database pagination; bulk actions retained; no permanent-delete controls on Inbox.');
const p='C:/Users/Ilya/Documents/GitHub/ilya-hub-backend/supabase/functions/hub/index.ts';let backend=fs.readFileSync(p,'utf8');backend=backend.replace("  if(folder==='archive') query=","  if(folder==='inbox') query=query.or('provider.neq.gmail,provider_labels.cs.{INBOX}');\n  else if(folder==='archive') query=");fs.writeFileSync(p,backend);fs.writeFileSync(root+'/supabase/functions/hub/index.ts',backend);
