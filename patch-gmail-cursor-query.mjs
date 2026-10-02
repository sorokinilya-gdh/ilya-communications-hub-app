import fs from 'node:fs';const file='supabase/functions/hub/index.ts';let s=fs.readFileSync(file,'utf8');
const old="if (sync?.history_cursor) params.set('pageToken', sync.history_cursor);\n  else if (sync?.initial_import_complete && sync.last_message_at) params.set('q', `after:${Math.floor(new Date(sync.last_message_at).getTime() / 1000) - 1}`);\n  else if (recentOnly) params.set('q', 'newer_than:1d');";
if(!s.includes(old))throw Error('Missing Gmail cursor configuration');
s=s.replace(old,`let savedCursor=null;try{savedCursor=JSON.parse(sync?.history_cursor||'null')}catch{}
  if(sync?.history_cursor){params.set('pageToken',savedCursor?.pageToken||sync.history_cursor);if(savedCursor?.query)params.set('q',savedCursor.query)}
  else if(sync?.initial_import_complete&&sync.last_message_at)params.set('q','after:'+String(Math.floor(new Date(sync.last_message_at).getTime()/1000)-1));
  else if(recentOnly)params.set('q','after:'+String(Math.floor(Date.now()/1000)-86400));`);
const start=s.indexOf('async function syncGmail('),end=s.indexOf('function extractAccountRecords(',start),chunk=s.slice(start,end);
if(!chunk.includes('history_cursor: page.nextPageToken ?? null,'))throw Error('Missing Gmail cursor persistence');
s=s.slice(0,start)+chunk.replace('history_cursor: page.nextPageToken ?? null,',"history_cursor: page.nextPageToken ? JSON.stringify({pageToken:page.nextPageToken,query:params.get('q')||''}) : null,")+s.slice(end);fs.writeFileSync(file,s);console.log('Gmail cursor now retains its query between pages.');
