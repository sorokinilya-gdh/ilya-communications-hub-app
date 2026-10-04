
import fs from 'node:fs';let s=fs.readFileSync('assets/index-PersistentCompact20261004.js','utf8');
s=s.replace('const[searchResults,setSearchResults]=F.useState(null);','const[compactReaderOpen,setCompactReaderOpen]=F.useState(false);const[searchResults,setSearchResults]=F.useState(null);');
s=s.replace('className:"mail-layout",children:[','className:compactReaderOpen?"mail-layout reader-open":"mail-layout",children:[');
s=s.replace('onClick:()=>nl(S.id),className:','onClick:()=>{setCompactReaderOpen(true);nl(S.id)},className:');
s=s.replace('className:"reader-toolbar",children:[','className:"reader-toolbar",children:[m.jsx("button",{onClick:()=>setCompactReaderOpen(false),title:"Close message",children:"Back to list"}),');
fs.writeFileSync('assets/index-PersistentCompact20261004.js',s);let css=fs.readFileSync('assets/index-PersistentCompact20261004.css','utf8').replaceAll('.mail-layout:has(.message.active)','.mail-layout.reader-open');css+='\n.list-header{padding:8px 14px!important}.list-header h1{font-size:20px!important}.list-header .eyebrow{display:none}.mail-controls{padding:5px 12px!important}.connection-health+.notice{font-size:11px;padding:4px 12px}\n';fs.writeFileSync('assets/index-PersistentCompact20261004.css',css);
let test=fs.readFileSync('test-persistent-compact.mjs','utf8');test=test.replace("vm.runInContext(fs.readFileSync('persistent-sync-helper.txt','utf8'),sandbox);","vm.runInContext(js.slice(js.indexOf('function HubPersistentSync20261004('),js.indexOf('function HubMergeRows20261004(')),sandbox);");fs.writeFileSync('test-persistent-compact.mjs',test);
