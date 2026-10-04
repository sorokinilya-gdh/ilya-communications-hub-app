import fs from 'node:fs';
let s=fs.readFileSync('assets/index-AuthRecovery20261004.js','utf8');
const start=s.indexOf('async function by(s,a)'),end=s.indexOf('const Un=',start);if(start<0||end<0)throw Error('Missing API wrapper');
s=s.slice(0,start)+`async function by(s,a){return HubSessionRequest20261004($o.auth,fetch,i1(s),a)}`+s.slice(end);
const old='HubAuthBootstrap20261004($o.auth).then(result=>{if(active){r(result.session);v(result.message);c(!1)}}).catch(()=>{if(active){v("Unable to verify your session. Check your connection and reload.");c(!1)}});return()=>{active=false;b.subscription.unsubscribe()}';
const replacement='let timer,busy=false,attempts=0;async function recover(){if(busy||!active)return;busy=true;try{const result=await HubAuthBootstrap20261004($o.auth);if(!active)return;if(result.retry){v("Connection interrupted. Reconnecting automatically…");timer=setTimeout(recover,Math.min(60000,3000*2**Math.min(attempts++,4)))}else{attempts=0;r(result.session);v(result.message);c(!1)}}catch{if(active){v("Connection interrupted. Reconnecting automatically…");timer=setTimeout(recover,10000)}}finally{busy=false}}const wake=()=>{clearTimeout(timer);recover()};window.addEventListener("online",wake);const visible=()=>{if(document.visibilityState==="visible")wake()};document.addEventListener("visibilitychange",visible);recover();return()=>{active=false;clearTimeout(timer);window.removeEventListener("online",wake);document.removeEventListener("visibilitychange",visible);b.subscription.unsubscribe()}';
if(!s.includes(old))throw Error('Missing auth hook');s=s.replace(old,replacement);
const bootstrapStart=s.lastIndexOf('async function HubAuthBootstrap20261004');
s=s.slice(0,bootstrapStart)+`async function HubAuthBootstrap20261004(auth){const initialized=await auth.initialize();const result=await auth.getSession();const session=result.data?.session||null;if(session)return{session,message:""};const error=result.error||initialized?.error;if(HubAuthTransient20261004(error))return{session:null,message:"",retry:true};return{session:null,message:error?HubAuthError20261004(error):""};}
function HubAuthTransient20261004(error){return !!error&&(error.name==="AuthRetryableFetchError"||Number(error.status)>=500||/network|failed to fetch|timeout|lock.*timeout/i.test(String(error.message||"")));}
let HubRefreshPending20261004=null;
async function HubRefreshSession20261004(auth){if(!HubRefreshPending20261004)HubRefreshPending20261004=auth.refreshSession().finally(()=>{HubRefreshPending20261004=null});return HubRefreshPending20261004;}
async function HubSessionRequest20261004(auth,fetcher,url,options){let result=await auth.getSession();if(result.error)throw result.error;let session=result.data?.session;const request=()=>fetcher(url,{...options,headers:{"Content-Type":"application/json",...(options?.headers||{}),...(session?{Authorization:"Bearer "+session.access_token}:{})}});let response=await request();if(response.status===401&&session){const refreshed=await HubRefreshSession20261004(auth);if(refreshed.error)throw refreshed.error;if(refreshed.data?.session){session=refreshed.data.session;response=await request()}}const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(typeof data.error==="string"?data.error:"Request failed.");return{data};}
`;
fs.writeFileSync('assets/index-SessionRecovery20261004.js',s);
fs.writeFileSync('index.html',fs.readFileSync('index.html','utf8').replace('index-AuthRecovery20261004.js','index-SessionRecovery20261004.js'));
fs.writeFileSync('sw.js',fs.readFileSync('sw.js','utf8').replace('communications-hub-auth-recovery-20261004','communications-hub-session-recovery-20261004'));
const helpers=s.slice(s.lastIndexOf('async function HubAuthBootstrap20261004'));
const api=new Function('HubAuthError20261004',helpers+';return {HubAuthBootstrap20261004,HubSessionRequest20261004}')(e=>e.message);
const assert=x=>{if(!x)throw Error('Session recovery failed')};
assert((await api.HubAuthBootstrap20261004({initialize:async()=>({}),getSession:async()=>({error:{name:'AuthRetryableFetchError'}})})).retry===true);
let refreshes=0,calls=0;const auth={getSession:async()=>({data:{session:{access_token:'test-old'}}}),refreshSession:async()=>{refreshes++;return{data:{session:{access_token:'test-new'}}}}};
const fetcher=async(url,options)=>{calls++;return{status:options.headers.Authorization==='Bearer test-old'?401:200,ok:options.headers.Authorization==='Bearer test-new',json:async()=>({ok:true})}};
await Promise.all([api.HubSessionRequest20261004(auth,fetcher,'test',{}),api.HubSessionRequest20261004(auth,fetcher,'test',{})]);assert(refreshes===1&&calls===4);
calls=0;try{await api.HubSessionRequest20261004(auth,async()=>{calls++;return{status:403,ok:false,json:async()=>({error:'Forbidden'})}},'test',{})}catch(e){assert(e.message==='Forbidden')}assert(calls===1&&refreshes===1);
console.log('PASS: transient auth retries; shared refresh; 401 retry; no retry on permissions failure');
