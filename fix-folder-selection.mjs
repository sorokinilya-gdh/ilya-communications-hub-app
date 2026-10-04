
import fs from 'node:fs';const p='assets/index-BulkSelection20261004.js';let s=fs.readFileSync(p,'utf8');const a=s.indexOf('function HubFolderPages20261004('),b=s.indexOf('function HubPageRows20261004(',a);let f=s.slice(a,b);
f=f.replace('[selected,setSelected]=F.useState(null)','[openedMessage,setOpenedMessage]=F.useState(null)').replace('onClick:()=>setSelected(item)','onClick:()=>setOpenedMessage(item)').replace('selected&&m.jsxs','openedMessage&&m.jsxs').replace('onClick:()=>setSelected(null)','onClick:()=>setOpenedMessage(null)').replaceAll('selected.subject','openedMessage.subject').replaceAll('selected.sender','openedMessage.sender').replaceAll('selected.email','openedMessage.email').replace('message:selected},selected.id','message:openedMessage},openedMessage.id');
f=f.replace('F.useEffect(()=>{setPage(1);','const selectedRecords=F.useRef(new Map());F.useEffect(()=>{setPage(1);');
f=f.replace('setItems(data.messages||[]);','for(const item of data.messages||[])selectedRecords.current.set(item.id,item);setItems(data.messages||[]);');
f=f.replace('items.filter(x=>selected.has(x.id)),action,folder','[...selected].map(id=>selectedRecords.current.get(id)).filter(Boolean),action,folder');
s=s.slice(0,a)+f+s.slice(b);fs.writeFileSync(p,s);
