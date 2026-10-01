import fs from 'node:fs';let s=fs.readFileSync('assets/index-ResponsiveInbox20261001.js','utf8');
const old='provider:a.provider.split(":")[0]}';if(!s.includes(old))throw Error('Missing sender mapping');s=s.replace(old,'provider:a.provider.split(":")[0],connectedAt:a.connected_at}');
s=s.replace('a.email+" · "+a.provider','a.email+" · "+a.provider+" · connected "+(a.connectedAt?new Date(a.connectedAt).toLocaleString():"unknown")');
fs.writeFileSync('assets/index-AccountDates20261001.js',s);fs.writeFileSync('index.html',fs.readFileSync('index.html','utf8').replace('index-ResponsiveInbox20261001.js','index-AccountDates20261001.js'));
