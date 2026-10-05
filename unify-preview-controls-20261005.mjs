
import fs from 'node:fs';const p='assets/index-PreviewControls20261005.js';let s=fs.readFileSync(p,'utf8');
const marker='m.jsx("section",{className:d?"reader mobile-hidden":"reader"';const start=s.indexOf(marker);if(start<0)throw Error('Legacy reader missing');
let depth=0,quote='',end=-1;for(let i=s.indexOf('(',start);i<s.length;i++){const c=s[i];if(quote){if(c==='\\'){i++;continue}if(c===quote)quote='';continue}if(c==='"'||c==="'"||c.charCodeAt(0)===96){quote=c;continue}if(c==='(')depth++;if(c===')'&&--depth===0){end=i+1;break}}
if(end<0)throw Error('Legacy reader could not be bounded');console.log('Shared reader replaces',end-start,'characters');s=s.slice(0,start)+'ne&&m.jsx(HubReader20261005,{message:ne,onClose:()=>{setCompactReaderOpen(false);g(true)},onDelete:()=>providerTrash(ne)},ne.id)'+s.slice(end);
s=s.replace("className:'folder-reader',children:[toolbar(false)","className:'folder-reader reader',children:[toolbar(false)");
fs.writeFileSync(p,s);
