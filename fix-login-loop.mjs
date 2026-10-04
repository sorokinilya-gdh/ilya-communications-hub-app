import fs from 'node:fs';
let s=fs.readFileSync('assets/index-BulkSelection20261004.js','utf8');
function replace(a,b){if(!s.includes(a))throw Error('Missing patch target');s=s.replace(a,b)}
replace('F.useEffect(()=>{$o.auth.getSession().then(({data:j})=>{r(j.session),c(!1)});const{data:b}=$o.auth.onAuthStateChange((j,A)=>{r(A),c(!1)});return()=>b.subscription.unsubscribe()},[]);','F.useEffect(()=>{let active=true;const{data:b}=$o.auth.onAuthStateChange((j,A)=>{if(active){r(A);c(!1)}});HubAuthBootstrap20261004($o.auth).then(result=>{if(active){r(result.session);v(result.message);c(!1)}}).catch(()=>{if(active){v("Unable to verify your session. Check your connection and reload.");c(!1)}});return()=>{active=false;b.subscription.unsubscribe()}},[]);');
replace('v("Sending your secure sign-in link…");const j=', 'const wait=HubAuthResendWait20261004(localStorage.getItem("hub:last-link-request"));if(wait){v("A link was already requested. Open the newest email, or wait "+wait+" seconds before requesting another.");return}v("Sending your secure sign-in link…");localStorage.setItem("hub:last-link-request",String(Date.now()));const j=');
replace('v(A?A.message:"Check your email and open the secure sign-in link.")','v(A?HubAuthError20261004(A):"Open the newest Supabase Auth email. Earlier links may be expired or already used. After opening the link, this page should show your inbox.")');
s+='\n'+`function HubAuthError20261004(error){const code=String(error?.code||"");const message=String(error?.message||"");if(/otp_expired|expired|invalid.*token|already.*used/i.test(code+" "+message))return "This sign-in link has expired or was already used. Request one new link, then open only the newest Supabase Auth email.";if(/rate.limit|over_email_send_rate_limit/i.test(code+" "+message))return "Supabase has temporarily limited sign-in emails. Wait before requesting another link.";return "Sign-in failed: "+(message||"Your session could not be verified.");}
function HubAuthResendWait20261004(last,now=Date.now()){return Math.max(0,Math.ceil((Number(last||0)+60000-now)/1000));}
async function HubAuthBootstrap20261004(auth){const initialized=await auth.initialize();const result=await auth.getSession();const session=result.data?.session||null;if(session)return{session,message:""};const error=initialized?.error||result.error;return{session:null,message:error?HubAuthError20261004(error):""};}
`;
fs.writeFileSync('assets/index-AuthRecovery20261004.js',s);
let html=fs.readFileSync('index.html','utf8').replace('index-BulkSelection20261004.js','index-AuthRecovery20261004.js');fs.writeFileSync('index.html',html);
let sw=fs.readFileSync('sw.js','utf8').replace("communications-hub-20261004","communications-hub-auth-recovery-20261004");fs.writeFileSync('sw.js',sw);
const helpers=s.slice(s.lastIndexOf('function HubAuthError20261004'));
const {HubAuthBootstrap20261004:boot,HubAuthResendWait20261004:wait,HubAuthError20261004:error}=new Function(helpers+';return {HubAuthBootstrap20261004,HubAuthResendWait20261004,HubAuthError20261004}')();
const assert=(x)=>{if(!x)throw Error('Authentication regression failed')};
assert((await boot({initialize:async()=>({error:{code:'otp_expired'}}),getSession:async()=>({data:{session:null}})})).message.includes('expired'));
const session={user:{email:'test@example.com'}};assert((await boot({initialize:async()=>({error:{code:'otp_expired'}}),getSession:async()=>({data:{session}})})).session===session);
assert(wait(1000,2000)===59&&wait(1000,62000)===0);assert(error({code:'over_email_send_rate_limit'}).includes('limited'));
console.log('PASS: expired links, stored-session recovery, resend cooldown, rate-limit explanation');
