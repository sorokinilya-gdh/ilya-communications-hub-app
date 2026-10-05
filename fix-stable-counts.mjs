import fs from 'node:fs';const root='C:/Users/Ilya/Documents/GitHub/ilya-communications-hub-recovered/site';let s=fs.readFileSync(root+'/assets/index-ProgressiveInbox20261005.js','utf8');
function swap(a,b){if(!s.includes(a))throw Error('Patch point missing: '+a.slice(0,70));s=s.replace(a,b)}
swap('[gTotal,setGTotal]=F.useState(()=>Number(localStorage.getItem("hub:gmail:total")||0)),','[zTotal,setZTotal]=F.useState(()=>Number(localStorage.getItem("hub:zoho:total")||0)),[gTotal,setGTotal]=F.useState(()=>Number(localStorage.getItem("hub:gmail:total")||0)),');
swap('mailboxes:Bn,total:setGTotal','mailboxes:Bn,total:setGTotal,zohoTotal:count=>{setZTotal(count);localStorage.setItem("hub:zoho:total",String(count))}');
swap('function HubPersistentSync20261004({gmail,zoho,gmailStatus,zohoStatus,mailboxes,total})','function HubPersistentSync20261004({gmail,zoho,gmailStatus,zohoStatus,mailboxes,total,zohoTotal})');
swap("if(provider==='gmail')total(initial.total||0);else mailboxes","if(provider==='gmail')total(initial.total||0);else {zohoTotal(initial.total||0);}if(provider==='zoho')mailboxes");
swap("if(provider==='gmail')total(count)}offset+=500;","if(provider==='gmail')total(count);else zohoTotal(count)}offset+=500;");
swap('it.filter(S=>S.provider!=="Gmail"&&!removedMailboxes.has(S.mailboxOwner||S.originalRecipient)).length:te?.connected','(removedMailboxes.size?it.filter(S=>S.provider!=="Gmail"&&!removedMailboxes.has(S.mailboxOwner||S.originalRecipient)).length:zTotal):te?.connected');
const sync="const synced=(await Un.post(provider==='gmail'?'/sync/gmail/recent':'/api/integrations/zoho/sync',{})).data;if(provider==='gmail'){const backfill=(await Un.post('/api/integrations/gmail/sync',{})).data;synced.hasMore=synced.hasMore||backfill.hasMore}if(!alive)return;";
swap(sync,'');swap("if(!info.connected)throw Error(provider+' needs authorization');",'');
swap('delay=synced.hasMore?3000:60000;', "if(!info.connected)throw Error(provider+' needs authorization');"+sync+'delay=synced.hasMore?3000:60000;');
fs.writeFileSync(root+'/assets/index-StableCounts20261005.js',s);fs.writeFileSync(root+'/index.html',fs.readFileSync(root+'/index.html','utf8').replace('index-ProgressiveInbox20261005.js','index-StableCounts20261005.js'));console.log('Both provider totals persist; stored inbox pages load before token refresh/sync so provider outages cannot hide them.');
