import fs from 'node:fs';
const p='test-recent-gmail.mjs';let s=fs.readFileSync(p,'utf8');
s=s.replace('let saved=[],lists=[],filters=[]','let saved=[],lists=[],filters=[],recentState=null');
s=s.replace("q.key.endsWith(':recent')?null:","q.key.endsWith(':recent')?recentState:");
s=s.replace("messages:[{id:'receipt'}]","messages:[{id:'receipt'}],nextPageToken:'next-page'");
s=s.replace("assert.equal(lists[0].searchParams.get('q'),'newer_than:1d')","assert.match(lists[0].searchParams.get('q'),/^after:\\d+$/)");
s += "\nrecentState=saved.find(x=>x.name==='communication_sync_state'&&x.row.provider.endsWith(':recent')).row;const cursor=JSON.parse(recentState.history_cursor);assert.equal(cursor.query,lists[0].searchParams.get('q'));await c.syncGmail(true);assert.equal(lists[2].searchParams.get('q'),cursor.query);assert.equal(lists[2].searchParams.get('pageToken'),'next-page');console.log('PASS: recent pagination retains the original absolute date query');\n";
fs.writeFileSync(p,s);
