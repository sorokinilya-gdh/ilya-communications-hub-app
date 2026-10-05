
import fs from 'node:fs';
let s=fs.readFileSync('assets/index-OnDemandMailbox20261005.js','utf8');
function replace(a,b){if(!s.includes(a))throw Error('Missing anchor '+a.slice(0,80));s=s.replace(a,b)}
replace("className:'folder-pages'","className:openedMessage?'folder-pages folder-reader-open':'folder-pages'");
replace("className:'folder-row',children:","className:'folder-row'+(openedMessage?.id===item.id?' active':''),role:'button',tabIndex:0,onClick:()=>setOpenedMessage(item),onKeyDown:e=>{if(e.target===e.currentTarget&&(e.key==='Enter'||e.key===' ')){e.preventDefault();setOpenedMessage(item)}},children:");
replace("'aria-label':'Select email from '+item.sender+': '+item.subject,onChange:","'aria-label':'Select email from '+item.sender+': '+item.subject,onClick:e=>e.stopPropagation(),onChange:");
replace("m.jsx('span',{title:item.email,children:item.sender}),m.jsx('span',{children:item.toAddress||item.originalRecipient||item.mailboxOwner}),","m.jsx(HubEnvelope20261005,{message:item}),");
replace("className:item.unread?'folder-subject unread':'folder-subject'","className:item.unread?'folder-subject unread':'folder-subject'");
replace("className:'folder-actions',children:","className:'folder-actions',onClick:e=>e.stopPropagation(),onKeyDown:e=>e.stopPropagation(),children:");
const start=s.indexOf("openedMessage&&m.jsxs('section',{className:'folder-reader'");
const end=s.indexOf("]});",start);
if(start<0||end<0)throw Error('Reader missing');
s=s.slice(0,start)+"openedMessage&&m.jsx(HubReader20261005,{message:openedMessage,onClose:()=>setOpenedMessage(null),onAction:selectedAction},openedMessage.id)"+s.slice(end);
replace('m.jsx("span",{className:S.unread?"sender unread":"sender",title:S.email,children:S.sender}),m.jsx("span",{className:"message-to",title:S.toAddress||S.originalRecipient||S.mailboxOwner,children:S.toAddress||S.originalRecipient||S.mailboxOwner}),','m.jsx(HubEnvelope20261005,{message:S}),');
s+=`
function HubFormSender20261005(message){
 if(!/ugold\\.co/i.test(String(message.sender)+' '+String(message.email)))return null;
 const raw=String(message.body||message.preview||message.html||'').replace(/<br\\s*\\/?\\s*>|<\\/p>|<\\/div>|<\\/tr>/gi,'\\n').replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/&#64;/g,'@').replace(/&amp;/g,'&');
 const field=label=>{const hit=raw.match(new RegExp('(?:^|\\\\n)\\\\s*(?:'+label+')\\\\s*[:：]\\\\s*([^\\\\n]+)','im'));return hit?.[1]?.trim()};
 const name=message.formSenderName||field('Full name|Your name|Name|Sender name');
 const email=message.formSenderEmail||field('Your email|Email address|Email');
 return name?{name,email:email?.match(/[^\\s<>]+@[^\\s<>]+\\.[^\\s<>]+/)?.[0]||''}:null;
}
function HubEnvelope20261005({message}){
 const[hydrated,setHydrated]=F.useState(null);
 F.useEffect(()=>{let alive=true;if(/ugold\\.co/i.test(String(message.sender)+' '+String(message.email))&&!HubFormSender20261005(message))Un.get('/message/content?id='+encodeURIComponent(message.id)).then(({data})=>{if(alive)setHydrated(data.message||null)}).catch(()=>{});return()=>{alive=false}},[message.id]);
 const form=HubFormSender20261005(hydrated||message),sender=form?.name||message.sender||message.email,mailbox=message.mailboxOwner||message.originalRecipient||message.toAddress||'';
 return m.jsxs('span',{className:'hub-envelope',children:[m.jsx('span',{className:'hub-from',title:form?.email||message.email,children:'From: '+sender}),m.jsx('span',{className:'hub-to',title:message.toAddress||message.originalRecipient,children:'To: '+(message.toAddress||message.originalRecipient||mailbox)}),m.jsx('span',{className:'hub-mailbox',title:mailbox,children:'Mailbox: '+mailbox})]});
}
function HubReader20261005({message,onClose}){
 const[body,setBody]=F.useState(''),[notice,setNotice]=F.useState('');
 return m.jsxs('section',{className:'folder-reader',children:[m.jsxs('div',{className:'reader-toolbar',children:[m.jsx('button',{onClick:onClose,children:'Close message'}),m.jsx('button',{onClick:()=>document.querySelector('.folder-reader textarea')?.focus(),children:'Reply'})]}),m.jsxs('div',{className:'reader-body',children:[m.jsx('h2',{children:message.subject}),m.jsx(HubEnvelope20261005,{message}),m.jsx(HubFullMessage20261002,{message},message.id),m.jsx('label',{children:'Reply'}),m.jsx('textarea',{'aria-label':'Reply text',value:body,onChange:e=>setBody(e.target.value),rows:7,style:{width:'100%'}}),m.jsx('button',{onClick:async()=>{setNotice('Generating reply…');try{const{data}=await Un.post('/api/draft-reply',{sender:message.sender,subject:message.subject,body:message.body,project:message.project});setBody(data.draft||'');setNotice('')}catch(e){setNotice(e.message)}},children:'AI draft'}),m.jsx(HubReplySend20261002,{message,body,onSave:()=>{localStorage.setItem('hub:reply:'+message.id,body);setNotice('Draft saved')},onSent:()=>setBody('')}),notice&&m.jsx('p',{role:'status',children:notice})]})]});
}
`;
fs.writeFileSync('assets/index-ReaderTwoLines20261005.js',s);
let css=fs.readFileSync('assets/index-PersistentCompact20261004.css','utf8');
css+=`
/* Two-line envelope and side-by-side reader */
.folder-pages{display:grid;grid-template-columns:minmax(0,1fr);grid-auto-rows:max-content;gap:0;overflow:hidden;height:calc(100vh - 92px);padding:0}
.folder-pages>header,.folder-pages>.bulk-selection-bar,.folder-pages>.folder-pagination,.folder-pages>p{grid-column:1;padding:8px 12px;margin:0}
.folder-pages .folder-table{grid-column:1;min-width:0;overflow:auto;min-height:0;height:calc(100vh - 230px)}
.folder-pages.folder-reader-open{grid-template-columns:minmax(0,52%) minmax(0,48%)}
.folder-pages .folder-reader{grid-column:2;grid-row:1 / span 8;min-width:0;height:100%;overflow:auto;padding:0;margin:0;border-left:1px solid #cbd3d9}
.folder-reader .reader-body{padding:20px}.folder-reader h2{font-size:20px;overflow-wrap:anywhere}
.folder-row,.messages .message{display:grid!important;grid-template-columns:22px minmax(0,1fr) auto!important;grid-template-rows:22px 22px!important;height:56px!important;min-height:56px!important;min-width:0!important;gap:0 8px!important;padding:6px 12px!important;cursor:pointer}
.folder-row>input,.messages .message>input{grid-column:1;grid-row:1 / span 2}
.hub-envelope{grid-column:2 / span 2;grid-row:1;display:flex!important;gap:12px;min-width:0;font-size:12px;white-space:nowrap}
.hub-envelope>span{min-width:0;overflow:hidden;text-overflow:ellipsis}.hub-from{flex:1}.hub-to{flex:1}.hub-mailbox{flex:1.2;color:#58666c}
.folder-subject,.messages .message>.subject{grid-column:2;grid-row:2;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left;font-size:13px!important}
.folder-actions,.messages .message>.compact-actions{grid-column:3;grid-row:2;overflow:visible;display:flex;gap:4px}
.folder-row>time,.messages .message>time,.folder-head,.compact-columns{display:none!important}
.folder-row.active{background:#e1eaf0}.folder-row:focus-visible{outline:2px solid #2f7469;outline-offset:-2px}
.mail-layout.reader-open{grid-template-columns:minmax(0,52%) minmax(0,48%)!important}
@media(max-width:650px){.folder-pages.folder-reader-open{grid-template-columns:minmax(0,1fr)}.folder-pages.folder-reader-open> :not(.folder-reader){display:none}.folder-pages .folder-reader{grid-column:1;grid-row:1;height:calc(100vh - 92px)}.hub-envelope{gap:5px;font-size:11px}}
`;
fs.writeFileSync('assets/index-ReaderTwoLines20261005.css',css);
let h=fs.readFileSync('index.html','utf8').replace('index-OnDemandMailbox20261005.js','index-ReaderTwoLines20261005.js').replace('index-PersistentCompact20261004.css','index-ReaderTwoLines20261005.css');fs.writeFileSync('index.html',h);
fs.writeFileSync('sw.js',fs.readFileSync('sw.js','utf8').replace('communications-hub-code-delivery-20261004','communications-hub-reader-two-lines-20261005'));
console.log('Patched reader and both email lists');
