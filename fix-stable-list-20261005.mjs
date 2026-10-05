
import fs from 'node:fs';
let s=fs.readFileSync('assets/index-ReaderTwoLines20261005.js','utf8');
function patch(a,b){if(!s.includes(a))throw Error('Missing '+a.slice(0,100));s=s.replace(a,b)}
patch("[version,setVersion]=F.useState(0);","[version,setVersion]=F.useState(0);const backgroundRefresh=F.useRef(false),loadedQuery=F.useRef('');const[pendingUpdates,setPendingUpdates]=F.useState(false);");
patch("timer=setTimeout(()=>setVersion(x=>x+1),1000)","timer=setTimeout(()=>{backgroundRefresh.current=true;setVersion(x=>x+1)},1000)");
patch("let alive=true;const key=HubArchivePageKey20261004(folder,importantOnly,pageSize,page);","let alive=true;const query=[folder,importantOnly,page,pageSize,search].join('|'),background=backgroundRefresh.current&&loadedQuery.current===query;backgroundRefresh.current=false;const key=HubArchivePageKey20261004(folder,importantOnly,pageSize,page);");
patch("setItems(data.messages||[]);setTotal(data.total||0);","if(background){setItems(previous=>{const incoming=new Map((data.messages||[]).map(x=>[x.id,x]));const previousIds=new Set(previous.map(x=>x.id));if((data.messages||[]).some(x=>!previousIds.has(x.id))||previous.some(x=>!incoming.has(x.id)))setPendingUpdates(true);return previous.map(x=>incoming.get(x.id)||x)});}else{setItems(data.messages||[]);setPendingUpdates(false)}loadedQuery.current=query;setTotal(data.total||0);");
patch("setNotice('Loading '+(folder==='archive'?'archive':'messages')+'…');","if(!background&&loadedQuery.current!==query)setNotice('Loading '+(folder==='archive'?'archive':'messages')+'…');");
patch("notice&&m.jsx('p',{role:'status',children:notice})","m.jsx('p',{className:'folder-status',role:'status','aria-live':'polite',children:notice||'\u00a0'})");
patch("children:total.toLocaleString()+' messages'}),","children:total.toLocaleString()+' messages'}),m.jsx('button',{className:'folder-update-button',disabled:busy,onClick:()=>{backgroundRefresh.current=false;setVersion(x=>x+1)},children:pendingUpdates?'Show new messages':'Refresh list'}),");
fs.writeFileSync('assets/index-StableReader20261005.js',s);
let css=fs.readFileSync('assets/index-ReaderTwoLines20261005.css','utf8')+`
.folder-pages{grid-template-rows:auto auto auto 30px minmax(0,1fr)}
.folder-pages>.folder-table{grid-row:5;height:auto!important;overflow-anchor:none;scrollbar-gutter:stable}
.folder-pages>.folder-status{grid-row:4;min-height:30px;height:30px;box-sizing:border-box;line-height:18px;padding:6px 12px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.folder-pages>.folder-reader{grid-row:1 / 6;height:100%;min-height:0}
.folder-update-button{min-width:140px}.folder-pages>header>span{min-width:115px}
.folder-pagination{min-height:36px;box-sizing:border-box}.bulk-selection-bar{min-height:40px;box-sizing:border-box}
@media(max-width:650px){.folder-pages.folder-reader-open{grid-template-rows:minmax(0,1fr)}.folder-pages.folder-reader-open>.folder-reader{grid-row:1;height:100%}}
`;
fs.writeFileSync('assets/index-StableReader20261005.css',css);
fs.writeFileSync('index.html',fs.readFileSync('index.html','utf8').replaceAll('index-ReaderTwoLines20261005','index-StableReader20261005'));
fs.writeFileSync('sw.js',fs.readFileSync('sw.js','utf8').replace('communications-hub-reader-two-lines-20261005','communications-hub-stable-reader-20261005'));
console.log('Stable refresh: reserved status line, silent sync, pinned row order, explicit new-message refresh');
