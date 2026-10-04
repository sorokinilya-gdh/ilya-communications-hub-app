import fs from 'node:fs';
let s=fs.readFileSync('assets/index-ArchiveCache20261004.js','utf8');
const target='options:{emailRedirectTo:j}';if(!s.includes(target))throw Error('Missing email auth options');s=s.replace(target,'options:{emailRedirectTo:j,shouldCreateUser:false}');
s=s.replace('No password is required.','Enter your email code once. This browser keeps your session and refreshes it automatically.');
s=s.replace('Send secure sign-in link','Send sign-in code');
s=s.replace('Check your email and open the secure sign-in link.','Enter the eight-digit code from the newest Supabase Auth email below.');
s=s.replace('Open the newest Supabase Auth email. Earlier links may be expired or already used. After opening the link, this page should show your inbox.','Enter the eight-digit code from the newest Supabase Auth email below. Keep this hub open in the browser you want to use.');
s=s.replace('Sending your secure sign-in link…','Sending your sign-in code…');
s=s.replace('A link was already requested. Open the newest email, or wait ','A code was already requested. Use the newest email, or wait ');
const needle='g&&m.jsx("p",{className:"auth-message",role:"status",children:g})';if(!s.includes(needle))throw Error('Missing auth notice');s=s.replace(needle,'m.jsx(HubCodeSignIn20261004,{}),'+needle);
s+='\n'+`function HubValidSignInCode20261004(code){return /^\\d{8}$/.test(String(code).trim())}
function HubCodeSignIn20261004(){const[code,setCode]=F.useState(''),[busy,setBusy]=F.useState(false),[notice,setNotice]=F.useState('');async function verify(event){event.preventDefault();if(busy)return;if(!HubValidSignInCode20261004(code)){setNotice('Enter the eight-digit sign-in code.');return}setBusy(true);setNotice('Verifying your session…');try{const result=await $o.auth.verifyOtp({email:Bo,token:code.trim(),type:'email'});if(result.error){setNotice(/expired|invalid|otp/i.test(String(result.error.code||'')+' '+String(result.error.message||''))?'This code is invalid or expired. Check the newest email. No replacement email has been sent.':HubAuthError20261004(result.error));return}if(!result.data?.session){setNotice('Verification did not return a session. No replacement email has been sent.');return}setCode('');setNotice('Signed in. Opening your inbox…')}catch{setNotice('Verification connection failed. No replacement email has been sent.')}finally{setBusy(false)}}return m.jsxs('form',{onSubmit:verify,children:[m.jsx('label',{htmlFor:'hub-sign-in-code',children:'Sign-in code'}),m.jsx('input',{id:'hub-sign-in-code',name:'otp',type:'text',inputMode:'numeric',autoComplete:'one-time-code',maxLength:8,value:code,onChange:e=>setCode(e.target.value),required:true,placeholder:'8-digit code',style:{width:'100%',padding:'12px',marginBottom:'12px'}}),m.jsx('button',{type:'submit',disabled:busy,children:busy?'Verifying…':'Verify code and open hub'}),notice&&m.jsx('p',{role:'status',children:notice})]})}
`;
fs.writeFileSync('assets/index-CodeLogin20261004.js',s);
fs.writeFileSync('index.html',fs.readFileSync('index.html','utf8').replace('index-ArchiveCache20261004.js','index-CodeLogin20261004.js'));
fs.writeFileSync('sw.js',fs.readFileSync('sw.js','utf8').replace('communications-hub-archive-cache-20261004','communications-hub-code-login-20261004'));
const path='C:/Users/Ilya/Documents/GitHub/ilya-hub-backend/supabase/config.toml';const conf=fs.readFileSync(path,'utf8');if(!conf.includes('[auth.email.template.magic_link]'))fs.writeFileSync(path,conf+'\n[auth.email.template.magic_link]\nsubject = "Your PCH sign-in code"\ncontent_path = "./supabase/templates/magic-link.html"\n');
fs.copyFileSync('C:/Users/Ilya/Documents/GitHub/ilya-hub-backend/supabase/templates/magic-link.html','supabase/templates-magic-link-code.html');
const fn=new Function(s.slice(s.lastIndexOf('function HubValidSignInCode20261004'),s.lastIndexOf('function HubCodeSignIn20261004'))+';return HubValidSignInCode20261004')();
if(!fn('12345678')||fn('123456')||fn('abcdefgh'))throw Error('Code validation failed');
console.log('PASS: eight-digit validation, existing-user-only requests, separate code verification form');
