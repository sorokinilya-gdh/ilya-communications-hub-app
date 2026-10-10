import fs from 'node:fs';import assert from 'node:assert/strict';
const root='C:/Users/Ilya/Documents/GitHub/ilya-communications-hub-recovered/site/';
let s=fs.readFileSync(root+'assets/index-ImmediateSpamPreview20261010.js','utf8');
const helper=`function HubOutgoingAttachments20261010({files,setFiles,disabled}){
 const input=F.useRef(null),[error,setError]=F.useState('');
 function add(incoming){const list=Array.from(incoming||[]);if(!list.length)return;setFiles(old=>{const result=[...old];for(const file of list){if(result.length>=20){setError('Maximum 20 attachments per message');break}if(file.size>15*1024*1024){setError(file.name+' exceeds 15 MB');continue}result.push(file)}return result})}
 return m.jsxs('div',{className:'hub-outgoing-attachments',onDragOver:e=>{e.preventDefault()},onDrop:e=>{e.preventDefault();if(!disabled)add(e.dataTransfer.files)},onPaste:e=>{if(disabled)return;const files=Array.from(e.clipboardData?.files||[]);if(files.length){e.preventDefault();add(files)}},children:[
 m.jsx('button',{type:'button',disabled,onClick:()=>input.current?.click(),children:'Attach files'}),
 m.jsx('input',{ref:input,type:'file',multiple:true,style:{display:'none'},onChange:e=>{add(e.target.files);e.target.value=''}}),
 m.jsx('span',{children:'Drop files here, paste files, or select multiple documents'}),
 ...files.map((file,i)=>m.jsxs('div',{className:'attachment-chip',children:[m.jsx('span',{children:file.name+' ('+Math.ceil(file.size/1024)+' KB)'}),m.jsx('button',{type:'button',disabled,onClick:()=>setFiles(old=>old.filter((_,j)=>j!==i)),children:'Remove'})]},i)),
 error&&m.jsx('p',{role:'alert',children:error})
 ]})
}
async function HubEncodeAttachments20261010(files){const results=[];for(const file of files){const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('Could not read '+file.name));reader.readAsDataURL(file)});results.push({name:file.name,type:file.type||'application/octet-stream',data})}return results}
`;
assert(s.includes('function HubLiveCompose20261001'));s=s.replace('function HubLiveCompose20261001',helper+'\nfunction HubLiveCompose20261001');
s=s.replace('[accounts,setAccounts]=F.useState([]),[busy,setBusy]', '[attachments,setAttachments]=F.useState([]),[accounts,setAccounts]=F.useState([]),[busy,setBusy]');
const sendOld='body:draft.body});if(!data.sent)';
assert(s.includes(sendOld));s=s.replace(sendOld,'body:draft.body,attachments:await HubEncodeAttachments20261010(attachments)});if(!data.sent)');
s=s.replace('setDraft({from:draft.from,to:"",subject:"",body:""});','setDraft({from:draft.from,to:"",subject:"",body:""});setAttachments([]);');
const composeOld='m.jsx("textarea",{"aria-label":"Message",placeholder:"Write your message…",value:draft.body,disabled:busy,onChange:e=>update("body",e.target.value)}),';
assert(s.includes(composeOld));s=s.replace(composeOld,composeOld+'m.jsx(HubOutgoingAttachments20261010,{files:attachments,setFiles:setAttachments,disabled:busy}),');
const readerStart=s.indexOf('function HubReader20261005'),readerEnd=s.indexOf('function HubImportantCounts20261006',readerStart);
assert(readerStart>0&&readerEnd>readerStart);
let reader=s.slice(readerStart,readerEnd);
reader=reader.replace('[sending,setSending]=F.useState(false),','[sending,setSending]=F.useState(false),[attachments,setAttachments]=F.useState([]),');
reader=reader.replace('setMode(action);setTo(', 'setAttachments([]);setMode(action);setTo(');
const replyOld="body,...(mode==='forward'?{}:{replyToMessageId:message.id,threadId:full?.threadId})";
assert(reader.includes(replyOld));reader=reader.replace(replyOld,"body,attachments:await HubEncodeAttachments20261010(attachments),...(mode==='forward'?{}:{replyToMessageId:message.id,threadId:full?.threadId})");
reader=reader.replace("setBody('');setComposer(false)","setBody('');setAttachments([]);setComposer(false)");
const replyText="m.jsx('textarea',{ref:textarea,'aria-label':'Reply text',value:body,onChange:e=>setBody(e.target.value),rows:8}),";
assert(reader.includes(replyText));reader=reader.replace(replyText,replyText+"m.jsx(HubOutgoingAttachments20261010,{files:attachments,setFiles:setAttachments,disabled:sending}),");
s=s.slice(0,readerStart)+reader+s.slice(readerEnd);
fs.writeFileSync(root+'assets/index-OutgoingAttachments20261010.js',s);
let html=fs.readFileSync(root+'index.html','utf8');assert(html.includes('index-ImmediateSpamPreview20261010.js'));fs.writeFileSync(root+'index.html',html.replace('index-ImmediateSpamPreview20261010.js','index-OutgoingAttachments20261010.js'));
console.log('Outgoing attachment UI created');
