
import fs from 'node:fs';import http from 'node:http';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/Ilya/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
let js=fs.readFileSync(new URL('./assets/index-ImportantCounts20261006.js',import.meta.url),'utf8');
js=js.replace('"serviceWorker"in navigator&&window.addEventListener','false&&window.addEventListener');
const original='m.jsx(F.StrictMode,{children:m.jsx(R1,{children:m.jsx(C1,{})})})';
assert(js.includes(original));js=js.replace(original,'m.jsx(CountHarness,{})');
const start=js.indexOf('.createRoot(document.getElementById("root"))')-2,end=js.indexOf(';',start)+1,mount=js.slice(start,end);js=js.slice(0,start)+js.slice(end);
js+=`
window.__counts={unread:3,read:2};window.__requests=0;window.__delay=0;
by=async(url,options)=>{
 if(url==='/messages/counts'){window.__requests++;const counts={...window.__counts};if(window.__delay)await new Promise(r=>setTimeout(r,window.__delay));return{data:{important:counts}}}
 if(options){if(window.__reject)throw Error('Failed');const p=JSON.parse(options.body);if(url==='/message/importance')window.__counts.unread+=p.important?1:-1;if(url==='/message/action')window.__counts.read--;return{data:{ok:true}}}
 return{data:{}};
};
window.__api=Un;
function CountHarness(){const c=HubImportantCounts20261006();return m.jsx('div',{id:'badge',children:c?'Unread '+c.unread+' · Read '+c.read:'Loading…'})}
`+mount;
const server=http.createServer((req,res)=>{if(req.url==='/test.js'){res.setHeader('Content-Type','text/javascript');res.end(js)}else res.end('<div id="root"></div><script type="module" src="/test.js"></script>')}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
async function badge(text){await page.waitForFunction(text=>document.querySelector('#badge')?.textContent===text,text)}
try{
 await page.goto('http://127.0.0.1:'+server.address().port);await badge('Unread 3 · Read 2');
 await page.evaluate(()=>window.__api.post('/message/importance',{important:true}));await badge('Unread 4 · Read 2');
 await page.evaluate(()=>window.__api.post('/message/importance',{important:false}));await badge('Unread 3 · Read 2');
 await page.evaluate(()=>window.__api.post('/message/action',{action:'trash'}));await badge('Unread 3 · Read 1');
 const before=await page.evaluate(()=>window.__requests);await page.evaluate(()=>Promise.all(Array.from({length:20},()=>window.__api.post('/message/importance',{important:true}))));await badge('Unread 23 · Read 1');assert.equal(await page.evaluate(()=>window.__requests),before+1);
 await page.evaluate(()=>{window.__counts={unread:2,read:22};window.dispatchEvent(new CustomEvent('hub-sync-health',{detail:{ok:true}}))});await badge('Unread 2 · Read 22');
 await page.evaluate(()=>{window.__delay=700;window.__counts={unread:100,read:100};window.dispatchEvent(new Event('hub-message-counts-changed'))});
 await page.waitForTimeout(300);await page.evaluate(()=>{window.__counts={unread:4,read:5};window.__delay=0;window.dispatchEvent(new Event('hub-message-counts-changed'))});await badge('Unread 4 · Read 5');
 await page.evaluate(async()=>{window.__reject=true;try{await window.__api.post('/message/importance',{important:true})}catch{}});await page.waitForTimeout(400);assert.equal(await page.locator('#badge').textContent(),'Unread 4 · Read 5');
 assert.deepEqual(errors,[]);console.log('PASS: startup, mark/unmark, delete, bulk debounce, synchronization, stale response protection and failed actions; no Important navigation.');
}finally{await browser.close();server.close()}
