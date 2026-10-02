import fs from 'node:fs';let s=fs.readFileSync('assets/index-AuthStatus20261001.js','utf8');
function patch(a,b){if(!s.includes(a))throw Error('Missing search patch anchor');s=s.replace(a,b)}
patch('return(S?H:A1).filter(re=>!la.has(re.id)&&!ve.has(re.id)&&!V.has(re.email.toLowerCase())&&(s!=="Unified Inbox"||!removedMailboxes.has(re.mailboxOwner||re.originalRecipient)))','return(S?H:A1).filter(re=>c.trim()||(!la.has(re.id)&&!ve.has(re.id)&&!V.has(re.email.toLowerCase())&&(s!=="Unified Inbox"||!removedMailboxes.has(re.mailboxOwner||re.originalRecipient))))');
patch('[V,_e,te==null?void 0:te.connected,la,nt,Te,Y==null?void 0:Y.connected,s,removedMailboxes]','[V,_e,te==null?void 0:te.connected,la,nt,Te,Y==null?void 0:Y.connected,s,removedMailboxes,c]');
patch('const text=[S.sender,S.subject,S.preview,S.project,S.transcription??""]','const text=[S.sender,S.email,S.subject,S.preview,S.project,S.mailboxOwner,S.originalRecipient,S.transcription??""]');
patch('if(c.trim()&&!text.includes(c.toLowerCase()))return!1;','if(c.trim()&&!c.toLowerCase().trim().split(/\\s+/).every(term=>text.includes(term)))return!1;');
patch('return s==="Important"?S.priority:','if(s==="Unified Inbox"&&c.trim())return!0;return s==="Important"?S.priority:');
fs.writeFileSync('assets/index-FullSearch20261002.js',s);fs.writeFileSync('index.html',fs.readFileSync('index.html','utf8').replace('index-AuthStatus20261001.js','index-FullSearch20261002.js'));console.log('Global search retains matches across folders and matches independent terms.');
