
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const code=fs.readFileSync('bulk-selection-ui.txt','utf8'),rows=Array.from({length:213},(_,i)=>({id:'gmail:'+i,provider:'Gmail',mailboxOwner:'test@example.com',email:'sender@example.com'}));
let inflight=0,max=0,calls=[];const ctx={Set,Number,Math,Array,Promise,Error,String,Un:{async post(url,data){inflight++;max=Math.max(max,inflight);calls.push({url,data});await new Promise(r=>setTimeout(r,1));inflight--;if(data.id==='gmail:2')throw Error('Provider unavailable');return{data:{}}}}};vm.createContext(ctx);vm.runInContext(code,ctx);
for(const n of [25,50,100]){assert.equal(ctx.HubPageRows20261004(rows,1,n).length,n);assert.equal(ctx.HubPageRows20261004(rows,2,n)[0].id,'gmail:'+n)}
assert.equal(ctx.HubPageRows20261004(rows,1,0).length,100);assert.equal(ctx.HubPageRows20261004(rows,9,100).length,13);
let selected=ctx.HubTogglePage20261004(new Set(['gmail:200']),rows.slice(0,25),true);assert.equal(selected.size,26);selected=ctx.HubTogglePage20261004(selected,rows.slice(0,25),false);assert.deepEqual([...selected],['gmail:200']);
const result=await ctx.HubRunSelected20261004(rows.slice(0,8),'trash',null);assert.equal(result.succeeded.length,7);assert.equal(result.failed.length,1);assert(max<=3);assert(calls.every(x=>x.data.action==='trash'&&x.data.mailbox==='test@example.com'));
calls=[];await ctx.HubRunSelected20261004(rows.slice(0,1),'archive-important',null);assert.equal(calls[0].url,'/message/importance');assert.equal(calls[1].data.action,'archive');
const s=fs.readFileSync('assets/index-BulkSelection20261004.js','utf8');assert(s.includes('aria-label":"Select email from'));assert(s.includes('HubPageRows20261004(Gs,inboxPage,inboxPageSize)'));assert(s.includes('selectedRecords.current.get(id)'));assert(!s.slice(s.indexOf('async function providerTrash'),s.indexOf('async function providerImportant')).includes('confirm'));
console.log('PASS: 25/50/100 paging, default100, last-page clamp, page selection, cross-page preservation, max3 requests, partial failure and Archive Important order');
