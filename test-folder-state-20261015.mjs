
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import crypto from 'node:crypto';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('C:/Users/Ilya/Documents/GitHub/gdh-ai-operating-system/apps/web/node_modules/typescript');
const store=new Map(),localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
const context=vm.createContext({localStorage,crypto,URL,Date,Error,JSON,Map,Set,Promise,navigator:{onLine:true},setTimeout:()=>1,clearTimeout:()=>{},Event:class{},CustomEvent:class{constructor(type,init){this.type=type;this.detail=init.detail}},window:{dispatchEvent(){},addEventListener(){}},document:{addEventListener(){}},by:async()=>{throw Error('HTTP 402 exceed_egress_quota')}});
vm.runInContext(fs.readFileSync('folder-operations-20261015.js','utf8')+';globalThis.api={queue:HubOpsQueue20261015,read:HubOpsRead20261015,apply:HubOpsApply20261015,error:HubOpsError20261015};',context);
const api=context.api,row={id:'gmail:unit',provider:'Gmail',mailboxOwner:'fixture@example.invalid',folder:'inbox',time:'2026-10-01T00:00:00Z'};
api.queue('/message/action',{id:row.id,action:'trash'},[row]);assert.equal(api.apply({messages:[row],total:1},'/messages?folder=inbox').messages.length,0);assert.equal(api.apply({messages:[],total:0},'/messages?folder=trash').messages.length,1);
api.queue('/message/action',{id:row.id,action:'restore'},[row]);assert.equal(api.apply({messages:[],total:0},'/messages?folder=inbox').messages.length,1);
api.queue('/message/action',{id:row.id,action:'delete'},[row]);assert.throws(()=>api.queue('/message/action',{id:row.id,action:'restore'},[row]),/Deleted messages/);
api.queue('/folders/delete-indexed-batch',{folder:'spam',before:new Date().toISOString()});assert.equal(api.apply({messages:[{...row,id:'gmail:spam',folder:'spam'}],total:1000},'/messages?folder=spam').total,0);
api.error(Error('HTTP 402 exceed_egress_quota'));assert(api.read().pausedUntil>Date.now());
const source=fs.readFileSync('assets/index-FolderParity20261015.js','utf8'),ast=ts.createSourceFile('pch.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='by');assert(fn);let called=0;
const network=new Function('HubOpsRead20261015','HubSessionRequest20261004','$o','fetch','i1','HubOpsError20261015',fn.getText(ast)+';return by')(()=>({pausedUntil:Date.now()+60000}),async()=>{called++;return{}},{auth:{}},()=>{},x=>x,e=>e);
await assert.rejects(network('/messages'),/free quota/);assert.equal(called,0);
store.clear();const restored={...row,id:'gmail:counter',folder:'trash'};api.queue('/message/action',{id:restored.id,action:'restore'},[restored]);assert.equal(api.apply({messages:[],total:100,__fetchedAt:0},'/messages?folder=inbox').total,101);
console.log('PASS pure state: local Trash and Inbox overlays, deletion tombstones, complete-folder snapshots, and quota gate prevents network requests.');
