import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const s=fs.readFileSync('assets/index-StableSearch20261002.js','utf8');let timers=[],effect,result=null,pending=[];
const context={F:{useEffect:fn=>effect=fn},c:'first query',setSearchResults:r=>result=r,D:()=>{},setTimeout:fn=>{timers.push(fn);return timers.length},clearTimeout:()=>{},Un:{get:()=>new Promise(resolve=>pending.push(resolve))}};
vm.createContext(context);const a=s.indexOf('F.useEffect(()=>{const term=c.trim();'),b=s.indexOf('F.useEffect(',a+20);vm.runInContext(s.slice(a,b),context);
const cleanup=effect(),first=timers[0]();cleanup();context.c='second query';effect();pending[0]({data:{messages:[{id:'obsolete'}]}});await first;assert.equal(result,null);
const second=timers[1]();pending[1]({data:{messages:[{id:'current'}]}});await second;assert.equal(result[0].id,'current');
context.c='';effect();assert.equal(result,null);console.log('PASS: stale search responses ignored; current results retained; clearing search restores mailbox data');
