
import fs from 'node:fs';let s=fs.readFileSync('test-reader-two-lines-20261005.mjs','utf8').replaceAll('index-ReaderTwoLines20261005','index-StableReader20261005');
s=s.replace("let js=fs.readFileSync","fixture.push(...Array.from({length:98},(_,i)=>({...fixture[1],id:'gmail:extra'+i,subject:'Message '+i})));let js=fs.readFileSync");
s=s.replace("Un.get=async(url)=>({data:url.startsWith('/message/content')?{message:${JSON.stringify(fixture)}.find(x=>url.includes(encodeURIComponent(x.id)))}:{messages:${JSON.stringify(fixture)},total:2}});","window.__rows=${JSON.stringify(fixture)};window.__calls=0;Un.get=async(url)=>{window.__calls++;if(window.__delay)await new Promise(r=>setTimeout(r,window.__delay));return{data:url.startsWith('/message/content')?{message:window.__rows.find(x=>url.includes(encodeURIComponent(x.id)))}:{messages:window.__rows,total:window.__rows.length}}};");
s=s.replace("count(),2)","count(),100)");
const insert=`
await page.locator('.folder-table').evaluate(e=>{e.scrollTop=180});
const snapshot=()=>page.evaluate(()=>{const table=document.querySelector('.folder-table'),row=table.querySelector('.folder-row:not(.folder-head)');return{top:table.getBoundingClientRect().top,scroll:table.scrollTop,first:row.textContent}});
const before=await snapshot();const calls=await page.evaluate(()=>window.__calls);
await page.evaluate(()=>{window.__delay=400;window.__rows=[{...window.__rows[0],id:'gmail:new',sender:'New Sender',subject:'Newest arrival'},...window.__rows.slice().reverse()];window.dispatchEvent(new CustomEvent('hub-sync-health',{detail:{ok:true}}))});
await page.waitForFunction(n=>window.__calls>n,calls);const during=await snapshot();assert.deepEqual(during,before,'List must not shift while refresh is running');
await page.getByRole('button',{name:'Show new messages',exact:true}).waitFor();const after=await snapshot();assert.deepEqual(after,before,'Background refresh must preserve top, scroll and first row');assert((await page.locator('.folder-reader').innerText()).includes('Partnership proposal'),'Reader stays selected');
await page.getByRole('button',{name:'Show new messages',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.folder-row:not(.folder-head) .folder-subject')?.textContent==='Newest arrival');
console.log('PASS: delayed background refresh preserves list top, scroll, row order and reader; new mail appears only on explicit refresh');
`;
s=s.replace("await page.setViewportSize",insert+"await page.setViewportSize");fs.writeFileSync('test-stable-reader-20261005.mjs',s);
