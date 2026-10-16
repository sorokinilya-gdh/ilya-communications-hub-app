const fs=require('fs');process.chdir('C:/Users/Ilya/Documents/GitHub/pch-parity-main');
const file='assets/index-FolderParity20261015.js';let s=fs.readFileSync(file,'utf8');
function replace(a,b){if(!s.includes(a))throw Error('Missing '+a.slice(0,80));s=s.replace(a,b)}
replace('state.marks[record.id]={folder,at:now,','state.marks[record.id]={folder,at:now,attentionHandled:true,');
replace('s==="Needs My Attention"?S.priority','s==="Needs My Attention"?HubNeedsAttention20261015(S)');
replace('if(sa==="attention"&&!S.priority)return!1;','if(sa==="attention"&&!HubNeedsAttention20261015(S))return!1;');
s='function HubNeedsAttention20261015(message){const state=HubOpsRead20261015(),mark=state.marks[message.id];return !!message.priority&&!mark?.attentionHandled&&!["archive","trash","spam","deleted"].includes(mark?.folder||message.folder)}\n'+s;
replace("['archive','Archive'],['archive-important','Archive Important']","['archive','Archive selected'],['archive-important','Archive selected - Important']");
replace("onClick:()=>remove('all'),children:'Empty '+title","onClick:()=>remove('all'),style:{background:'#9b2424',color:'#fff',fontWeight:700,padding:'10px 16px'},children:'Empty '+title");
const ts=require('C:/Users/Ilya/Documents/GitHub/gdh-ai-operating-system/apps/web/node_modules/typescript');const ast=ts.createSourceFile('hub.js',s,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(ast.parseDiagnostics.length)throw Error(ast.parseDiagnostics.map(x=>x.messageText).join(';'));
fs.writeFileSync(file,s);let helper=fs.readFileSync('folder-operations-20261015.js','utf8');helper=helper.replace('state.marks[record.id]={folder,at:now,','state.marks[record.id]={folder,at:now,attentionHandled:true,');fs.writeFileSync('folder-operations-20261015.js',helper);
let index=fs.readFileSync('index.html','utf8').replace('index-FolderParity20261015.js?v=4','index-FolderParity20261015.js?v=5');fs.writeFileSync('index.html',index);
console.log('Personal Hub attention and visible bulk controls patched.');
