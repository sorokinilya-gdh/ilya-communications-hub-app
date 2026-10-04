import fs from 'node:fs';
const backend='C:/Users/Ilya/Documents/GitHub/ilya-hub-backend/supabase/functions/hub/index.ts';
let b=fs.readFileSync(backend,'utf8');const needle="    const unauthorized = await requireIlya(request);";if(!b.includes(needle))throw Error('Missing auth guard');
b=b.replace(needle,"    if(path==='/auth/request-code'&&request.method==='POST')return await requestPchCode20261004(request);\n"+needle);
b+='\n'+`function pchCodeRequestAllowed20261004(origin,email){return origin==='https://sorokinilya-gdh.github.io'&&String(email||'').trim().toLowerCase()==='sorokin.ilya@gmail.com'}
async function requestPchCode20261004(request){
 const owner='sorokin.ilya@gmail.com';let payload;try{payload=await request.json()}catch{return response(400,{error:'Invalid sign-in request'})}
 if(!pchCodeRequestAllowed20261004(request.headers.get('origin'),payload.email))return response(403,{error:'This sign-in request is not allowed'});
 const db=admin(),now=Date.now(),key='pch-auth-code',stamp=new Date(now).toISOString(),cutoff=new Date(now-60000).toISOString();
 const inserted=await db.from('communication_sync_state').upsert({provider:key,updated_at:'1970-01-01T00:00:00.000Z',history_cursor:'[]'},{onConflict:'provider',ignoreDuplicates:true});if(inserted.error)return response(503,{error:'Sign-in delivery is temporarily unavailable'});
 const state=await db.from('communication_sync_state').select('updated_at,history_cursor').eq('provider',key).single();if(state.error)return response(503,{error:'Sign-in delivery is temporarily unavailable'});
 let times=[];try{times=JSON.parse(state.data.history_cursor||'[]').filter(x=>Number(x)>now-3600000)}catch{}
 if(times.length>=10)return response(429,{error:'Too many code requests. Try later; no replacement code was sent'});
 const claimed=await db.from('communication_sync_state').update({updated_at:stamp,history_cursor:JSON.stringify([...times,now])}).eq('provider',key).eq('updated_at',state.data.updated_at).lt('updated_at',cutoff).select('provider');if(claimed.error)return response(503,{error:'Sign-in delivery is temporarily unavailable'});if(!claimed.data?.length)return response(429,{error:'Wait at least one minute before requesting another code'});
 try{
 const users=await db.auth.admin.listUsers({page:1,perPage:1000});if(users.error||!users.data.users.some(u=>u.email?.toLowerCase()===owner))throw Error('Approved user unavailable');
 const generated=await db.auth.admin.generateLink({type:'magiclink',email:owner});const code=generated.data?.properties?.email_otp;if(generated.error||!/^\\d{8}$/.test(code||''))throw Error('Sign-in generation unavailable');
 await sendGmail({from:owner,to:[owner],subject:'Your PCH sign-in code',body:'Enter this eight-digit code in Ilya Communications Hub:\\n\\n'+code+'\\n\\nKeep the hub open in the same browser. No sign-in link is required. If you did not request this code, ignore this email.'});
 return response(200,{sent:true,codeLength:8,retryAfter:60});
 }catch{return response(503,{error:'The sign-in code could not be delivered. No automatic replacement request will be made'})}
}
`;
fs.writeFileSync(backend,b);fs.writeFileSync('supabase/functions/hub/index.ts',b);
let s=fs.readFileSync('assets/index-CodeLogin20261004.js','utf8');
const old='const j=new URL("/ilya-communications-hub-app/",window.location.origin).toString(),{error:A}=await $o.auth.signInWithOtp({email:Bo,options:{emailRedirectTo:j,shouldCreateUser:false}});';
if(!s.includes(old))throw Error('Missing code request');
s=s.replace(old,`let A=null;try{await Un.post('/auth/request-code',{email:Bo})}catch(error){A=error}`);
s=s.replace('Supabase Auth email','PCH sign-in code email');
fs.writeFileSync('assets/index-CodeDelivery20261004.js',s);
fs.writeFileSync('index.html',fs.readFileSync('index.html','utf8').replace('index-CodeLogin20261004.js','index-CodeDelivery20261004.js'));
fs.writeFileSync('sw.js',fs.readFileSync('sw.js','utf8').replace('communications-hub-code-login-20261004','communications-hub-code-delivery-20261004'));
const helper=b.slice(b.lastIndexOf('function pchCodeRequestAllowed20261004'),b.lastIndexOf('async function requestPchCode20261004'));
const allowed=new Function(helper+';return pchCodeRequestAllowed20261004')();if(!allowed('https://sorokinilya-gdh.github.io','sorokin.ilya@gmail.com')||allowed('https://bad.example','sorokin.ilya@gmail.com')||allowed('https://sorokinilya-gdh.github.io','other@example.com'))throw Error('Request scope failed');
console.log('PASS: approved-origin and approved-address guards; direct code delivery; syntax verified separately');
