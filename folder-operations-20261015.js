
const HubOpsKey20261015='hub:folder-ops:v1',HubRows20261015=new Map();
let HubOpsBusy20261015=false,HubOpsTimer20261015=null;
function HubOpsRead20261015(){try{return JSON.parse(localStorage.getItem(HubOpsKey20261015)||'null')||{jobs:[],marks:{},empty:[],pausedUntil:0}}catch{throw Error('Saved folder actions could not be read. Do not clear browser storage; retry after checking storage access.')}}
function HubOpsSave20261015(state){localStorage.setItem(HubOpsKey20261015,JSON.stringify(state));window.dispatchEvent(new Event('hub-message-counts-changed'))}
function HubOpsError20261015(error){const text=String(error?.message||error);if(/exceed_egress_quota|restricted due|HTTP 402/.test(text)){const state=HubOpsRead20261015();state.pausedUntil=Date.now()+6*3600000;HubOpsSave20261015(state)}return error}
function HubOpsNotice20261015(){const s=HubOpsRead20261015();return s.jobs.length+' provider actions pending. '+(s.jobs.find(j=>j.error)?.error||'They will synchronize automatically while the hub is open.')}
function HubOpsQueue20261015(path,body,records=[]){
 const state=HubOpsRead20261015(),now=Date.now(),id=crypto.randomUUID();
 if(state.jobs.length>=5000)throw Error('There are 5000 saved actions awaiting provider access. Let synchronization finish before adding more.');
 const empty=path==='/folders/delete-indexed-batch',action=empty?'delete':path==='/message/not-spam'?'restore':path==='/message/importance'?'important':body.action;
 if(!empty&&state.marks[body.id]?.folder==='deleted')throw Error('Deleted messages cannot be restored or changed');
 const folder=action==='important'?(state.marks[body.id]?.folder||records[0]?.folder||'inbox'):action==='delete'?'deleted':action==='trash'?'trash':action==='spam'?'spam':action==='archive'?'archive':'inbox';
 if(empty){state.empty=state.empty.filter(x=>x.folder!==body.folder);state.empty.push({folder:body.folder,before:body.before,at:now})}
 else for(const record of records){const previous=state.marks[record.id]?.folder||record.folder||'inbox';if(previous!==folder){(state.deltas||=[]).push({jobId:id,mailbox:record.mailboxOwner||'',provider:String(record.provider||'').toLowerCase(),from:previous,to:folder,at:now,syncedAt:null})}const {body:ignoredBody,html:ignoredHtml,...compact}=record;state.marks[record.id]={folder,at:now,...(action==='important'?{priority:body.important===true}:{}),record:folder==='deleted'?{id:record.id}:{...compact,...(action==='important'?{priority:body.important===true}:{})}}}
 state.jobs.push({id,path,body,at:now,nextAt:now,attempt:0});HubOpsSave20261015(state);for(const change of state.deltas||[])if(change.jobId===id)window.dispatchEvent(new CustomEvent('hub-local-inbox-delta',{detail:{mailbox:change.mailbox,delta:Number(change.to==='inbox')-Number(change.from==='inbox')}}));HubOpsSchedule20261015(100);
 return{data:{ok:true,indexed:true,queued:true,important:body.important,deleted:action==='delete'?records.map(x=>x.id):[],failed:[],done:true}};
}
function HubOpsSchedule20261015(delay=30000){clearTimeout(HubOpsTimer20261015);HubOpsTimer20261015=setTimeout(()=>void HubOpsDrain20261015(),delay)}
async function HubOpsDrain20261015(){
 if(HubOpsBusy20261015)return;const state=HubOpsRead20261015(),job=state.jobs.find((j,i)=>j.nextAt<=Date.now()&&!state.jobs.slice(0,i).some(p=>p.body.id&&p.body.id===j.body.id||p.path==='/folders/delete-indexed-batch'||j.path==='/folders/delete-indexed-batch'));if(!navigator.onLine)return;if(!job){if(state.jobs.length)HubOpsSchedule20261015();return;}
 if(state.pausedUntil>Date.now()||job.nextAt>Date.now()){HubOpsSchedule20261015(Math.max(30000,Math.max(state.pausedUntil,job.nextAt)-Date.now()));return}
 HubOpsBusy20261015=true;
 try{
  const result=await by(job.path,{method:'POST',body:JSON.stringify(job.body)}),data=result.data;
  if(data.failed?.length)throw Error(data.failed.map(x=>x.error).join('; '));
  if((job.path==='/message/action')&&(data.ok!==true||data.indexed!==true))throw Error('Provider did not acknowledge the saved action.');
  const fresh=HubOpsRead20261015();
  if(job.path==='/folders/delete-indexed-batch'&&!data.done){const j=fresh.jobs.find(x=>x.id===job.id);if(j)j.nextAt=Date.now()+30000}
  else{fresh.jobs=fresh.jobs.filter(x=>x.id!==job.id);for(const d of fresh.deltas||[])if(d.jobId===job.id)d.syncedAt=Date.now();}
  HubOpsSave20261015(fresh);
 }catch(error){const fresh=HubOpsRead20261015(),j=fresh.jobs.find(x=>x.id===job.id);if(j){j.attempt++;j.error=String(error.message||error);j.nextAt=Date.now()+Math.min(6*3600000,60000*2**Math.min(j.attempt,8));}HubOpsSave20261015(fresh);HubOpsError20261015(error)}
 finally{HubOpsBusy20261015=false;HubOpsSchedule20261015()}
}
function HubOpsApply20261015(data,path){
 const state=HubOpsRead20261015(),url=new URL(path,'https://hub.invalid'),folder=url.searchParams.get('folder')||((url.searchParams.get('search')||url.searchParams.get('allFolders')==='true')?'all':'inbox'),mailbox=url.searchParams.get('mailbox')||'',search=url.searchParams.get('search')||'';
 const source=data.messages||[];for(const row of source)HubRows20261015.set(row.id,row);
 let removed=0;const rows=source.filter(row=>{const mark=state.marks[row.id],empty=state.empty.find(x=>x.folder===(row.folder||folder)&&Date.parse(row.time||0)<=Date.parse(x.before));const hide=mark?(mark.folder==='deleted'||folder!=='all'&&folder!=='all'&&folder!=='all'&&folder!=='all'&&folder!=='all'&&folder!=='all'&&folder!=='all'&&mark.folder!==folder):!!empty;if(hide)removed++;return!hide}).map(row=>state.marks[row.id]?.priority!==undefined?{...row,priority:state.marks[row.id].priority}:row);
 if(folder!=='all'&&!url.searchParams.get('archiveFolderId')&&!search&&!Number(url.searchParams.get('offset')))for(const mark of Object.values(state.marks)){const row=mark.record;if(mark.folder===folder&&!state.empty.some(e=>e.folder===folder&&e.at>=mark.at)&&row&&(!mailbox||row.mailboxOwner===mailbox)&&!rows.some(x=>x.id===row.id))rows.unshift({...row,folder})}
 const emptied=state.empty.some(x=>x.folder===folder);
 const provider=String(url.searchParams.get('provider')||'').toLowerCase();const delta=url.searchParams.get('archiveFolderId')?-removed:(state.deltas||[]).filter(d=>(!d.syncedAt||d.syncedAt>(data.__fetchedAt||0))&&(!mailbox||d.mailbox===mailbox)&&(!provider||d.provider===provider)).reduce((n,d)=>n+(folder==='all'?Number(d.to!=='deleted')-Number(d.from!=='deleted'):Number(d.to===folder)-Number(d.from===folder)),0);return{...data,messages:rows,total:emptied?rows.length:Math.max(rows.length,(data.total||0)+(search||url.searchParams.get('importantOnly')==='true'?-removed:delta))};
}
async function HubGet20261015(path){
 if(!/^(\/messages|\/search)(\?|$)/.test(path))return by(path);
 const key='hub:folder-cache:v2:'+path;const archived=new URL(path,'https://hub.invalid').searchParams.get('folder')==='archive';if(archived){try{const cached=JSON.parse(localStorage.getItem(key)||'null');if(cached&&Date.now()-(cached.__fetchedAt||0)<86400000)return{data:HubOpsApply20261015(cached,path)}}catch{}}
 try{const result=await by(path);result.data={...result.data,__fetchedAt:Date.now()};const compact={...result.data,messages:(result.data.messages||[]).map(({body,html,...row})=>({...row,bodyHydrated:false}))};try{const keys=Object.keys(localStorage).filter(x=>x.startsWith('hub:folder-cache:v2:'));while(keys.length>=20)localStorage.removeItem(keys.shift());localStorage.setItem(key,JSON.stringify(compact))}catch{}return{...result,data:HubOpsApply20261015(result.data,path)}}
 catch(error){HubOpsError20261015(error);const saved=localStorage.getItem(key),state=HubOpsRead20261015(),folder=new URL(path,'https://hub.invalid').searchParams.get('folder');if(saved||state.empty.some(x=>x.folder===folder)||folder==='inbox'&&Object.values(state.marks).some(x=>x.folder==='inbox'))return{data:HubOpsApply20261015(saved?JSON.parse(saved):{messages:[],total:0},path)};throw error}
}
async function HubQueuedPost20261015(path,body){
 if(path==='/message/importance'||path==='/message/not-spam'||path==='/message/action'&&['trash','restore','archive','spam','delete'].includes(body.action)){
  const record=HubRows20261015.get(body.id)||{id:body.id};return HubOpsQueue20261015(path,body,[record]);
 }
 return null;
}
window.addEventListener('online',()=>HubOpsSchedule20261015(1000));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')HubOpsSchedule20261015(1000)});
HubOpsSchedule20261015(1000);

function HubOpsStatus20261015(){const[version,setVersion]=F.useState(0);F.useEffect(()=>{const changed=()=>setVersion(v=>v+1);window.addEventListener('hub-message-counts-changed',changed);return()=>window.removeEventListener('hub-message-counts-changed',changed)},[]);const s=HubOpsRead20261015();return s.jobs.length?m.jsx('p',{role:'status',className:'folder-status',children:HubOpsNotice20261015()}):null;}

let HubDiskPromise20261015=null,HubDiskWrites20261015=Promise.resolve();
function HubDiskOpen20261015(){if(!HubDiskPromise20261015)HubDiskPromise20261015=new Promise((resolve,reject)=>{const r=indexedDB.open('gdh-pch-mail-cache',1);r.onupgradeneeded=()=>{r.result.createObjectStore('data');r.result.createObjectStore('meta')};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Local message cache is blocked'))}).catch(e=>{HubDiskPromise20261015=null;throw e});return HubDiskPromise20261015}
async function HubDiskRead20261015(key){const db=await HubDiskOpen20261015();return new Promise((resolve,reject)=>{const r=db.transaction('data').objectStore('data').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
function HubDiskSave20261015(key,data){const work=HubDiskWrites20261015.catch(()=>{}).then(async()=>{const size=JSON.stringify(data).length*2;if(size>40*1024*1024)return false;const db=await HubDiskOpen20261015(),meta=await new Promise((resolve,reject)=>{const r=db.transaction('meta').objectStore('meta').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});let used=meta.filter(x=>x.key!==key).reduce((n,x)=>n+x.size,0);const discard=[];for(const x of meta.filter(x=>x.key!==key).sort((a,b)=>a.at-b.at)){if(used+size<=100*1024*1024)break;discard.push(x.key);used-=x.size}await new Promise((resolve,reject)=>{const tx=db.transaction(['data','meta'],'readwrite');for(const k of discard){tx.objectStore('data').delete(k);tx.objectStore('meta').delete(k)}tx.objectStore('data').put(data,key);tx.objectStore('meta').put({key,size,at:Date.now()},key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});return true});HubDiskWrites20261015=work;return work}
async function HubDiskRequest20261015(path){const id=new URL(path,'https://hub.invalid').searchParams.get('id'),mark=HubOpsRead20261015().marks[id];if(mark?.folder==='deleted')throw Error('This message was deleted from the hub');let cached;try{cached=await HubDiskRead20261015(path)}catch{}if(cached)return{data:cached};const result=await by(path);try{await HubDiskSave20261015(path,result.data)}catch{}return result}
